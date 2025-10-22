'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CustomMeasurementUsage {
  id: string;
  name: string;
  unit: string;
  type: string;
  usedBy: string[]; // Array of exercise names
  isLocked?: boolean; // True for predefined measurements that can't be edited/deleted
}

interface TagUsage {
  name: string;
  count: number;
}

interface CustomMeasurementsManagerProps {
  onClose: () => void;
  onUpdate: () => void; // Callback to refresh exercise list
}


const LOCKED_MEASUREMENTS = [
  'reps',
  'weight',
  'time',
  'sets',
  'distance',
  'exit_velo',
  'peak_velo',
];

export function CustomMeasurementsManager({ onClose, onUpdate }: CustomMeasurementsManagerProps) {
  const [activeTab, setActiveTab] = useState<'measurements' | 'tags'>('measurements');
  const [measurements, setMeasurements] = useState<CustomMeasurementUsage[]>([]);
  const [tags, setTags] = useState<TagUsage[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingMeasurement, setEditingMeasurement] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editType, setEditType] = useState<'integer' | 'decimal' | 'text'>('decimal');

  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');

  // Create states
  const [showCreateMeasurement, setShowCreateMeasurement] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [createMeasurementName, setCreateMeasurementName] = useState('');
  const [createMeasurementUnit, setCreateMeasurementUnit] = useState('');
  const [createMeasurementType, setCreateMeasurementType] = useState<'integer' | 'decimal' | 'text'>('decimal');
  const [createTagName, setCreateTagName] = useState('');

  useEffect(() => {
    fetchCustomMeasurements();
    fetchTags();
  }, []);

  async function fetchCustomMeasurements() {
    const supabase = createClient();

    // Fetch all exercises with their metric_schemas
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('id, name, metric_schema')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching exercises:', error);
      setLoading(false);
      return;
    }

    console.log('Fetched exercises:', exercises?.length);
    console.log('Sample exercise:', exercises?.[0]);

    // Extract ALL measurements (both predefined and custom)
    const measurementsMap = new Map<string, CustomMeasurementUsage>();

    exercises?.forEach((exercise) => {
      const measurements = exercise.metric_schema?.measurements || [];
      console.log(`Exercise "${exercise.name}" has ${measurements.length} measurements:`, measurements);

      measurements.forEach((m: any) => {
        const isLocked = LOCKED_MEASUREMENTS.includes(m.id);

        if (measurementsMap.has(m.id)) {
          // Add this exercise to the usage list
          const existing = measurementsMap.get(m.id)!;
          existing.usedBy.push(exercise.name);
        } else {
          // Create new entry
          measurementsMap.set(m.id, {
            id: m.id,
            name: m.name,
            unit: m.unit || '',
            type: m.type || 'decimal',
            usedBy: [exercise.name],
            isLocked: isLocked,
          });
        }
      });
    });

    console.log('Total unique measurements found:', measurementsMap.size);
    console.log('Measurements map:', Array.from(measurementsMap.entries()));

    // Sort: locked measurements first, then custom measurements
    const measurementsList = Array.from(measurementsMap.values()).sort((a, b) => {
      if (a.isLocked && !b.isLocked) return -1;
      if (!a.isLocked && b.isLocked) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log('Final measurements list:', measurementsList);

    setMeasurements(measurementsList);
    setLoading(false);
  }

  async function handleDelete(measurementId: string) {
    const measurement = measurements.find(m => m.id === measurementId);
    if (!measurement) return;

    const usageCount = measurement.usedBy.length;
    const message = usageCount > 0
      ? `This measurement is used by ${usageCount} exercise${usageCount > 1 ? 's' : ''}: ${measurement.usedBy.join(', ')}.\n\nDeleting it will remove it from all these exercises. Continue?`
      : 'Delete this custom measurement?';

    if (!confirm(message)) return;

    const supabase = createClient();

    // Fetch all exercises that use this measurement
    const { data: exercises, error: fetchError } = await supabase
      .from('exercises')
      .select('id, metric_schema')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching exercises:', fetchError);
      alert('Failed to delete measurement');
      return;
    }

    // Update each exercise's metric_schema to remove this measurement
    const updates = exercises
      ?.filter((ex) => {
        const measurements = ex.metric_schema?.measurements || [];
        return measurements.some((m: any) => m.id === measurementId);
      })
      .map(async (ex) => {
        const updatedMeasurements = ex.metric_schema.measurements.filter(
          (m: any) => m.id !== measurementId
        );

        const { error } = await supabase
          .from('exercises')
          .update({
            metric_schema: { measurements: updatedMeasurements },
          })
          .eq('id', ex.id);

        if (error) {
          console.error(`Error updating exercise ${ex.id}:`, error);
        }
        return error;
      });

    const results = await Promise.all(updates || []);
    const hasErrors = results.some((err) => err !== undefined);

    if (hasErrors) {
      alert('Some exercises failed to update. Please try again.');
    } else {
      // Refresh the list
      fetchCustomMeasurements();
      onUpdate(); // Refresh parent exercise list
    }
  }

  async function fetchTags() {
    const supabase = createClient();

    // Fetch all exercises and count by tags
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('tags')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching tags:', error);
      return;
    }

    // Count exercises per tag
    const tagMap = new Map<string, number>();
    exercises?.forEach((ex) => {
      ex.tags?.forEach((tag: string) => {
        const count = tagMap.get(tag) || 0;
        tagMap.set(tag, count + 1);
      });
    });

    // Build tag list
    const tagList: TagUsage[] = Array.from(tagMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));

    // Sort alphabetically
    tagList.sort((a, b) => a.name.localeCompare(b.name));

    setTags(tagList);
  }

  async function handleDeleteTag(tagName: string) {
    const tag = tags.find(t => t.name === tagName);
    if (!tag) return;

    const message = `This will remove the "${tagName}" tag from ${tag.count} exercise${tag.count !== 1 ? 's' : ''}. Continue?`;

    if (!confirm(message)) return;

    const supabase = createClient();

    // Fetch all exercises with this tag
    const { data: exercises, error: fetchError } = await supabase
      .from('exercises')
      .select('id, tags')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching exercises:', fetchError);
      alert('Failed to delete tag');
      return;
    }

    // Update each exercise to remove this tag
    const updates = exercises
      ?.filter((ex) => ex.tags?.includes(tagName))
      .map(async (ex) => {
        const updatedTags = ex.tags.filter((t: string) => t !== tagName);
        const { error } = await supabase
          .from('exercises')
          .update({ tags: updatedTags.length > 0 ? updatedTags : ['assessment'] }) // Ensure at least one tag
          .eq('id', ex.id);
        return error;
      });

    const results = await Promise.all(updates || []);
    const hasErrors = results.some((err) => err !== null && err !== undefined);

    if (hasErrors) {
      alert('Some exercises failed to update');
    } else {
      fetchTags();
      onUpdate(); // Refresh parent exercise list
    }
  }

  function startEditMeasurement(measurement: CustomMeasurementUsage) {
    setEditingMeasurement(measurement.id);
    setEditName(measurement.name);
    setEditUnit(measurement.unit);
    setEditType(measurement.type as 'integer' | 'decimal' | 'text');
  }

  async function saveEditMeasurement(oldId: string) {
    if (!editName.trim()) {
      alert('Measurement name is required');
      return;
    }

    const supabase = createClient();

    // Fetch all exercises that use this measurement
    const { data: exercises, error: fetchError } = await supabase
      .from('exercises')
      .select('id, metric_schema')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching exercises:', fetchError);
      alert('Failed to update measurement');
      return;
    }

    // Update each exercise's metric_schema
    const updates = exercises
      ?.filter((ex) => {
        const measurements = ex.metric_schema?.measurements || [];
        return measurements.some((m: any) => m.id === oldId);
      })
      .map(async (ex) => {
        const updatedMeasurements = ex.metric_schema.measurements.map((m: any) => {
          if (m.id === oldId) {
            return {
              ...m,
              name: editName.trim(),
              unit: editUnit.trim(),
              type: editType,
            };
          }
          return m;
        });

        const { error } = await supabase
          .from('exercises')
          .update({
            metric_schema: { measurements: updatedMeasurements },
          })
          .eq('id', ex.id);

        return error;
      });

    const results = await Promise.all(updates || []);
    const hasErrors = results.some((err) => err !== undefined);

    if (hasErrors) {
      alert('Some exercises failed to update');
    } else {
      setEditingMeasurement(null);
      fetchCustomMeasurements();
      onUpdate();
    }
  }

  function startEditTag(tagName: string) {
    setEditingTag(tagName);
    setEditTagName(tagName);
  }

  async function saveEditTag(oldName: string) {
    const newName = editTagName.trim().toLowerCase();

    if (!newName) {
      alert('Tag name is required');
      return;
    }

    if (newName === oldName) {
      setEditingTag(null);
      return;
    }

    const supabase = createClient();

    // Fetch all exercises with this tag
    const { data: exercises, error: fetchError } = await supabase
      .from('exercises')
      .select('id, tags')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching exercises:', fetchError);
      alert('Failed to update tag');
      return;
    }

    // Update each exercise to rename this tag
    const updates = exercises
      ?.filter((ex) => ex.tags?.includes(oldName))
      .map(async (ex) => {
        const updatedTags = ex.tags.map((t: string) => t === oldName ? newName : t);
        const { error } = await supabase
          .from('exercises')
          .update({ tags: updatedTags })
          .eq('id', ex.id);
        return error;
      });

    const results = await Promise.all(updates || []);
    const hasErrors = results.some((err) => err !== null && err !== undefined);

    if (hasErrors) {
      alert('Some exercises failed to update');
    } else {
      setEditingTag(null);
      fetchTags();
      onUpdate();
    }
  }

  async function createCustomMeasurement() {
    if (!createMeasurementName.trim()) {
      alert('Measurement name is required');
      return;
    }

    const newMeasurement: CustomMeasurement = {
      id: `custom_${Date.now()}`,
      name: createMeasurementName.trim(),
      unit: createMeasurementUnit.trim(),
      type: createMeasurementType,
    };

    // Add to local state
    setMeasurements([...measurements, { ...newMeasurement, usedBy: [] }]);

    // Reset form
    setShowCreateMeasurement(false);
    setCreateMeasurementName('');
    setCreateMeasurementUnit('');
    setCreateMeasurementType('decimal');

    alert(`Custom measurement "${newMeasurement.name}" created! Now you can use it in exercises.`);
  }

  async function createCustomTag() {
    if (!createTagName.trim()) {
      alert('Tag name is required');
      return;
    }

    const newTagName = createTagName.trim().toLowerCase();

    // Check if already exists
    if (tags.some(t => t.name === newTagName)) {
      alert('This tag already exists');
      return;
    }

    // Add to local state
    setTags([...tags, { name: newTagName, count: 0 }]);

    // Reset form
    setShowCreateTag(false);
    setCreateTagName('');

    alert(`Custom tag "${newTagName}" created! Now you can use it in exercises.`);
  }

  async function seedCoreMeasurements() {
    if (!confirm('This will add 4 core measurements (Reps, Weight, Time, Distance) to ALL exercises.\n\nThis will overwrite existing metric_schema. Continue?')) {
      return;
    }

    const supabase = createClient();
    setLoading(true);

    // Fetch all exercises
    const { data: exercises, error: fetchError } = await supabase
      .from('exercises')
      .select('id')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching exercises:', fetchError);
      alert('Failed to fetch exercises');
      setLoading(false);
      return;
    }

    const coreMeasurements = {
      measurements: [
        { id: 'reps', name: 'Reps', type: 'integer', unit: 'reps', enabled: true },
        { id: 'weight', name: 'Weight', type: 'decimal', unit: 'lbs', enabled: true },
        { id: 'time', name: 'Time', type: 'text', unit: 'mm:ss', enabled: true },
        { id: 'distance', name: 'Distance', type: 'decimal', unit: 'ft/yds', enabled: true },
      ],
    };

    // Update all exercises
    const updates = exercises?.map(async (ex) => {
      const { error } = await supabase
        .from('exercises')
        .update({ metric_schema: coreMeasurements })
        .eq('id', ex.id);

      return error;
    });

    const results = await Promise.all(updates || []);
    const hasErrors = results.some((err) => err !== null && err !== undefined);

    if (hasErrors) {
      alert('Some exercises failed to update. Check console for errors.');
      console.error('Update errors:', results.filter((r) => r !== null && r !== undefined));
    } else {
      alert(`Successfully seeded 4 core measurements to ${exercises?.length} exercises!`);
      fetchCustomMeasurements(); // Refresh
      onUpdate(); // Refresh parent
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold text-white">Library Manager</h2>
              <p className="text-sm text-gray-400 mt-1">
                Manage custom measurements and tags
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6">
          <button
            onClick={() => setActiveTab('measurements')}
            className={`px-4 py-3 font-medium transition-all border-b-2 ${
              activeTab === 'measurements'
                ? 'text-[#C9A857] border-[#C9A857]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Custom Measurements
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`px-4 py-3 font-medium transition-all border-b-2 ${
              activeTab === 'tags'
                ? 'text-[#C9A857] border-[#C9A857]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Tags
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="text-gray-400 mt-4">Loading...</p>
            </div>
          ) : activeTab === 'measurements' ? (
            // Measurements Tab
            <div className="space-y-4">
              {/* Create New Measurement Button/Form */}
              {showCreateMeasurement ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <h4 className="text-white font-semibold mb-2">Create New Custom Measurement</h4>
                  <p className="text-xs text-gray-400 mb-4">
                    Custom measurements will be available in the exercise creator for all exercises.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Name *</label>
                      <input
                        type="text"
                        value={createMeasurementName}
                        onChange={(e) => setCreateMeasurementName(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                        placeholder="e.g., Bar Speed, Jump Height, Ball Color"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Unit (optional)</label>
                        <input
                          type="text"
                          value={createMeasurementUnit}
                          onChange={(e) => setCreateMeasurementUnit(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                          placeholder="m/s, cm, mph, etc"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Type *</label>
                        <select
                          value={createMeasurementType}
                          onChange={(e) => setCreateMeasurementType(e.target.value as 'integer' | 'decimal' | 'text')}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                        >
                          <option value="integer">Integer (whole numbers: 1, 5, 10)</option>
                          <option value="decimal">Decimal (with decimals: 5.5, 10.25)</option>
                          <option value="text">Text (words: Blue, Red, Fast)</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                      <p className="text-xs text-blue-300">
                        <strong>Type Guide:</strong><br/>
                        • <strong>Integer</strong>: Whole numbers only (Reps: 10, Sets: 3)<br/>
                        • <strong>Decimal</strong>: Numbers with decimals (Weight: 185.5 lbs, Speed: 95.3 mph)<br/>
                        • <strong>Text</strong>: Words or labels (Ball Color: Blue, Difficulty: Hard)
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={createCustomMeasurement}
                        className="flex-1 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all text-sm font-medium"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateMeasurement(false);
                          setCreateMeasurementName('');
                          setCreateMeasurementUnit('');
                          setCreateMeasurementType('decimal');
                        }}
                        className="flex-1 px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-all text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateMeasurement(true)}
                  className="w-full px-4 py-3 bg-[#C9A857]/20 border border-[#C9A857]/50 text-[#C9A857] rounded-lg hover:bg-[#C9A857]/30 transition-all font-medium"
                >
                  + Create New Custom Measurement
                </button>
              )}

              {/* List of measurements */}
              {measurements.length === 0 && !showCreateMeasurement ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No custom measurements yet</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Click the button above to create your first custom measurement
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {measurements.map((measurement) => (
                  <div
                    key={measurement.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                  >
                    {editingMeasurement === measurement.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Unit</label>
                            <input
                              type="text"
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                              placeholder="lbs, mph, etc"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Type</label>
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as 'integer' | 'decimal' | 'text')}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                            >
                              <option value="integer">Integer</option>
                              <option value="decimal">Decimal</option>
                              <option value="text">Text</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => saveEditMeasurement(measurement.id)}
                            className="flex-1 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all text-sm font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingMeasurement(null)}
                            className="flex-1 px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-all text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-white font-semibold text-lg">{measurement.name}</h3>
                            {measurement.isLocked && (
                              <span className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded border border-gray-500/50 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                LOCKED
                              </span>
                            )}
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded border border-purple-500/50">
                              {measurement.type}
                            </span>
                            {measurement.unit && (
                              <span className="text-gray-400 text-sm">({measurement.unit})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>Used by {measurement.usedBy.length} exercise{measurement.usedBy.length !== 1 ? 's' : ''}</span>
                            {measurement.usedBy.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-md">{measurement.usedBy.join(', ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!measurement.isLocked && (
                            <>
                              <button
                                onClick={() => startEditMeasurement(measurement)}
                                className="p-2 hover:bg-blue-500/20 rounded-lg transition-all group"
                                title="Edit measurement"
                              >
                                <svg className="w-5 h-5 text-blue-400 group-hover:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(measurement.id)}
                                className="p-2 hover:bg-red-500/20 rounded-lg transition-all group"
                                title="Delete custom measurement"
                              >
                                <svg className="w-5 h-5 text-red-400 group-hover:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                </div>
              )}
            </div>
          ) : (
            // Tags Tab
            <div className="space-y-4">
              {/* Create New Tag Button/Form */}
              {showCreateTag ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <h4 className="text-white font-semibold mb-3">Create New Custom Tag</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Tag Name *</label>
                      <input
                        type="text"
                        value={createTagName}
                        onChange={(e) => setCreateTagName(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                        placeholder="e.g., plyometrics, agility, speed"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={createCustomTag}
                        className="flex-1 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all text-sm font-medium"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateTag(false);
                          setCreateTagName('');
                        }}
                        className="flex-1 px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-all text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateTag(true)}
                  className="w-full px-4 py-3 bg-[#C9A857]/20 border border-[#C9A857]/50 text-[#C9A857] rounded-lg hover:bg-[#C9A857]/30 transition-all font-medium"
                >
                  + Create New Custom Tag
                </button>
              )}

              {/* List of tags */}
              <div className="space-y-3">
              {tags.map((tag) => (
                <div
                  key={tag.name}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                >
                  {editingTag === tag.name ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Tag Name</label>
                        <input
                          type="text"
                          value={editTagName}
                          onChange={(e) => setEditTagName(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                          placeholder="Enter tag name..."
                        />
                      </div>
                      <div className="text-xs text-gray-400">
                        Used by {tag.count} exercise{tag.count !== 1 ? 's' : ''}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => saveEditTag(tag.name)}
                          className="flex-1 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all text-sm font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTag(null)}
                          className="flex-1 px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-all text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-semibold text-lg capitalize">{tag.name}</h3>
                        </div>
                        <div className="text-sm text-gray-400">
                          {tag.count} exercise{tag.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditTag(tag.name)}
                          className="p-2 hover:bg-blue-500/20 rounded-lg transition-all group"
                          title="Edit tag"
                        >
                          <svg className="w-5 h-5 text-blue-400 group-hover:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.name)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-all group"
                          title="Delete tag"
                        >
                          <svg className="w-5 h-5 text-red-400 group-hover:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
