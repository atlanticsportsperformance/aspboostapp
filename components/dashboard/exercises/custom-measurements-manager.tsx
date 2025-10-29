'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CustomMeasurementUsage {
  id: string;
  name: string;
  unit: string;
  type: 'reps' | 'performance_decimal' | 'performance_integer' | 'paired';
  category?: 'single' | 'paired';
  usedBy: string[]; // Array of exercise names
  isLocked?: boolean; // True for predefined measurements that can't be edited/deleted
  // For paired measurements
  primary_metric_id?: string;
  primary_metric_name?: string;
  secondary_metric_id?: string;
  secondary_metric_name?: string;
}

interface TagUsage {
  name: string;
  count: number;
}

interface Placeholder {
  id: string;
  name: string;
  category: string;
  description: string | null;
  usedBy: string[]; // Array of workout names where this placeholder is used
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
  const [activeTab, setActiveTab] = useState<'measurements' | 'placeholders'>('measurements');
  const [measurements, setMeasurements] = useState<CustomMeasurementUsage[]>([]);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingMeasurement, setEditingMeasurement] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'reps' | 'performance_decimal' | 'performance_integer'>('performance_decimal');
  const [editCategory, setEditCategory] = useState<'single' | 'paired'>('single');
  const [editPrimaryName, setEditPrimaryName] = useState('');
  const [editPrimaryType, setEditPrimaryType] = useState<'reps' | 'performance_decimal' | 'performance_integer'>('performance_decimal');
  const [editSecondaryName, setEditSecondaryName] = useState('');
  const [editSecondaryType, setEditSecondaryType] = useState<'reps' | 'performance_decimal' | 'performance_integer'>('performance_decimal');

  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');

  // Create states
  const [showCreateMeasurement, setShowCreateMeasurement] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [createMeasurementName, setCreateMeasurementName] = useState('');
  const [createMeasurementCategory, setCreateMeasurementCategory] = useState<'single' | 'paired'>('single');
  // For single measurements - name and type
  const [createPrimaryMetricName, setCreatePrimaryMetricName] = useState('');
  const [createPrimaryMetricType, setCreatePrimaryMetricType] = useState<'reps' | 'performance_decimal' | 'performance_integer'>('performance_decimal');
  // For paired measurements - secondary name and type
  const [createSecondaryMetricName, setCreateSecondaryMetricName] = useState('');
  const [createSecondaryMetricType, setCreateSecondaryMetricType] = useState<'reps' | 'performance_decimal' | 'performance_integer'>('performance_decimal');
  const [createTagName, setCreateTagName] = useState('');

  const [showCreatePlaceholder, setShowCreatePlaceholder] = useState(false);
  const [createPlaceholderName, setCreatePlaceholderName] = useState('');
  const [createPlaceholderCategory, setCreatePlaceholderCategory] = useState('strength_conditioning');
  const [createPlaceholderDescription, setCreatePlaceholderDescription] = useState('');
  const [editingPlaceholder, setEditingPlaceholder] = useState<string | null>(null);
  const [editPlaceholderName, setEditPlaceholderName] = useState('');
  const [editPlaceholderCategory, setEditPlaceholderCategory] = useState('');
  const [editPlaceholderDescription, setEditPlaceholderDescription] = useState('');

  useEffect(() => {
    fetchCustomMeasurements();
    fetchPlaceholders();
  }, []);

  async function fetchCustomMeasurements() {
    const supabase = createClient();

    // Fetch all measurements from custom_measurements table
    const { data: customMeasurements, error } = await supabase
      .from('custom_measurements')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching custom measurements:', error);
      setLoading(false);
      return;
    }

    console.log('Fetched custom measurements:', customMeasurements?.length);

    // Fetch exercises to check usage
    const { data: exercises } = await supabase
      .from('exercises')
      .select('id, name, metric_schema')
      .eq('is_active', true);

    // Map measurements with usage info
    const measurementsList = (customMeasurements || []).map((m: any) => {
      // Find which exercises use this measurement
      const usedBy: string[] = [];

      exercises?.forEach((ex) => {
        const measurements = ex.metric_schema?.measurements || [];

        if (m.category === 'single') {
          // Check if single measurement is used
          if (measurements.some((em: any) => em.id === m.id)) {
            usedBy.push(ex.name);
          }
        } else if (m.category === 'paired') {
          // Check if either metric in the pair is used
          if (measurements.some((em: any) =>
            em.id === m.primary_metric_id || em.id === m.secondary_metric_id
          )) {
            usedBy.push(ex.name);
          }
        }
      });

      return {
        id: m.id,
        name: m.name,
        unit: m.category === 'single' ? m.primary_metric_name : '',
        type: m.category === 'single' ? m.primary_metric_type : 'paired',
        category: m.category,
        usedBy,
        isLocked: m.is_locked || false,
        // For paired measurements
        primary_metric_id: m.primary_metric_id,
        primary_metric_name: m.primary_metric_name,
        secondary_metric_id: m.secondary_metric_id,
        secondary_metric_name: m.secondary_metric_name,
      };
    });

    // Sort: locked first, then by name
    measurementsList.sort((a, b) => {
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

    // For paired measurements, need to remove both metrics from exercises
    const metricsToRemove = measurement.category === 'paired'
      ? [measurement.primary_metric_id!, measurement.secondary_metric_id!]
      : [measurementId];

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
        return measurements.some((m: any) => metricsToRemove.includes(m.id));
      })
      .map(async (ex) => {
        const updatedMeasurements = ex.metric_schema.measurements.filter(
          (m: any) => !metricsToRemove.includes(m.id)
        );

        const { error} = await supabase
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
      return;
    }

    // Delete from custom_measurements table
    const { error: deleteError } = await supabase
      .from('custom_measurements')
      .delete()
      .eq('id', measurementId);

    if (deleteError) {
      console.error('Error deleting from custom_measurements:', deleteError);
      alert('Failed to delete measurement from database');
      return;
    }

    // Refresh the list
    fetchCustomMeasurements();
    onUpdate(); // Refresh parent exercise list
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

  async function fetchPlaceholders() {
    const supabase = createClient();

    // Fetch all placeholder exercises
    const { data: placeholderExercises, error } = await supabase
      .from('exercises')
      .select('id, name, category, description')
      .eq('is_placeholder', true)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching placeholders:', error);
      return;
    }

    // Map to Placeholder interface
    const placeholdersList: Placeholder[] = (placeholderExercises || []).map((ph) => ({
      id: ph.id,
      name: ph.name,
      category: ph.category,
      description: ph.description,
      usedBy: [] // Could fetch workout usage if needed
    }));

    setPlaceholders(placeholdersList);
  }

  async function createPlaceholder() {
    if (!createPlaceholderName.trim()) {
      alert('Placeholder name is required');
      return;
    }

    const supabase = createClient();

    // Get ALL available measurements from existing exercises
    const { data: allExercises } = await supabase
      .from('exercises')
      .select('metric_schema')
      .eq('is_active', true);

    // Extract unique measurements
    const measurementsMap = new Map<string, any>();
    allExercises?.forEach((ex) => {
      const measurements = ex.metric_schema?.measurements || [];
      measurements.forEach((m: any) => {
        if (!measurementsMap.has(m.id)) {
          measurementsMap.set(m.id, { ...m, enabled: true });
        }
      });
    });

    const allMeasurements = Array.from(measurementsMap.values());
    console.log('Creating placeholder with', allMeasurements.length, 'measurements');

    // Placeholders start with ALL available measurements
    const { data, error } = await supabase
      .from('exercises')
      .insert({
        name: createPlaceholderName.trim(),
        category: createPlaceholderCategory,
        description: createPlaceholderDescription.trim() || null,
        is_placeholder: true,
        is_active: true,
        tags: ['placeholder'],
        metric_schema: { measurements: allMeasurements }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating placeholder:', error);
      alert('Failed to create placeholder');
      return;
    }

    // Reset form
    setShowCreatePlaceholder(false);
    setCreatePlaceholderName('');
    setCreatePlaceholderCategory('strength_conditioning');
    setCreatePlaceholderDescription('');

    // Refresh placeholders
    fetchPlaceholders();
    onUpdate();
  }

  async function handleDeletePlaceholder(placeholderId: string) {
    if (!confirm('Delete this placeholder? This cannot be undone.')) return;

    const supabase = createClient();

    const { error } = await supabase
      .from('exercises')
      .update({ is_active: false })
      .eq('id', placeholderId);

    if (error) {
      console.error('Error deleting placeholder:', error);
      alert('Failed to delete placeholder');
    } else {
      fetchPlaceholders();
      onUpdate();
    }
  }

  async function handleUpdatePlaceholder(placeholderId: string) {
    if (!editPlaceholderName.trim()) {
      alert('Placeholder name is required');
      return;
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('exercises')
      .update({
        name: editPlaceholderName.trim(),
        category: editPlaceholderCategory,
        description: editPlaceholderDescription.trim() || null
      })
      .eq('id', placeholderId);

    if (error) {
      console.error('Error updating placeholder:', error);
      alert('Failed to update placeholder');
    } else {
      setEditingPlaceholder(null);
      fetchPlaceholders();
      onUpdate();
    }
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
    setEditCategory(measurement.category || 'single');

    if (measurement.category === 'paired') {
      setEditPrimaryName(measurement.primary_metric_name || '');
      setEditPrimaryType(measurement.type === 'reps' ? 'reps' : 'performance_decimal');
      setEditSecondaryName(measurement.secondary_metric_name || '');
      setEditSecondaryType('performance_decimal');
    } else {
      setEditName(measurement.primary_metric_name || measurement.name);
      setEditType(measurement.type as any);
    }
  }

  async function saveEditMeasurement(oldId: string) {
    const supabase = createClient();

    // Get the current measurement from custom_measurements table
    const { data: currentMeasurement, error: fetchError } = await supabase
      .from('custom_measurements')
      .select('*')
      .eq('id', oldId)
      .single();

    if (fetchError || !currentMeasurement) {
      console.error('Error fetching measurement:', fetchError);
      alert('Failed to fetch measurement');
      return;
    }

    // Validate based on category
    if (editCategory === 'single') {
      if (!editName.trim()) {
        alert('Measurement name/unit is required');
        return;
      }
    } else {
      if (!editPrimaryName.trim() || !editSecondaryName.trim()) {
        alert('Both primary and secondary metric names are required');
        return;
      }
    }

    // Update the custom_measurements table
    let updateData: any = {};

    if (editCategory === 'single') {
      updateData = {
        primary_metric_name: editName.trim(),
        primary_metric_type: editType
      };
    } else {
      updateData = {
        primary_metric_name: editPrimaryName.trim(),
        primary_metric_type: editPrimaryType,
        secondary_metric_name: editSecondaryName.trim(),
        secondary_metric_type: editSecondaryType
      };
    }

    const { error: updateError } = await supabase
      .from('custom_measurements')
      .update(updateData)
      .eq('id', oldId);

    if (updateError) {
      console.error('Error updating measurement:', updateError);
      alert('Failed to update measurement');
      return;
    }

    // Update exercises that use this measurement
    const { data: exercises } = await supabase
      .from('exercises')
      .select('id, metric_schema')
      .eq('is_active', true);

    if (editCategory === 'single') {
      // Update single measurement in exercises
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
                unit: editName.trim(),
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
      }
    } else {
      // For paired measurements, update both primary and secondary in exercises
      const updates = exercises
        ?.filter((ex) => {
          const measurements = ex.metric_schema?.measurements || [];
          return measurements.some((m: any) =>
            m.id === currentMeasurement.primary_metric_id ||
            m.id === currentMeasurement.secondary_metric_id
          );
        })
        .map(async (ex) => {
          const updatedMeasurements = ex.metric_schema.measurements.map((m: any) => {
            if (m.id === currentMeasurement.primary_metric_id) {
              return {
                ...m,
                name: editPrimaryName.trim(),
                unit: editPrimaryName.trim(),
                type: editPrimaryType,
              };
            }
            if (m.id === currentMeasurement.secondary_metric_id) {
              return {
                ...m,
                name: editSecondaryName.trim(),
                unit: editSecondaryName.trim(),
                type: editSecondaryType,
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
      }
    }

    setEditingMeasurement(null);
    fetchCustomMeasurements();
    onUpdate();
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

    if (!createPrimaryMetricName.trim()) {
      alert('Primary metric name is required');
      return;
    }

    if (createMeasurementCategory === 'paired' && !createSecondaryMetricName.trim()) {
      alert('Secondary metric name is required for paired measurements');
      return;
    }

    const supabase = createClient();

    const measurementId = `custom_${Date.now()}`;
    const baseId = measurementId.replace('custom_', '');

    let newMeasurement: any = {
      id: measurementId,
      name: createMeasurementName.trim(),
      category: createMeasurementCategory,
      is_locked: false
    };

    if (createMeasurementCategory === 'single') {
      // Single measurement - use primary metric fields
      newMeasurement = {
        ...newMeasurement,
        primary_metric_id: measurementId,
        primary_metric_name: createPrimaryMetricName.trim(),
        primary_metric_type: createPrimaryMetricType,
        secondary_metric_id: null,
        secondary_metric_name: null,
        secondary_metric_type: null
      };
    } else {
      // Paired measurement - use both primary and secondary fields
      newMeasurement = {
        ...newMeasurement,
        primary_metric_id: `${baseId}_primary`,
        primary_metric_name: createPrimaryMetricName.trim(),
        primary_metric_type: createPrimaryMetricType,
        secondary_metric_id: `${baseId}_secondary`,
        secondary_metric_name: createSecondaryMetricName.trim(),
        secondary_metric_type: createSecondaryMetricType
      };
    }

    const { error } = await supabase
      .from('custom_measurements')
      .insert(newMeasurement);

    if (error) {
      console.error('Error creating custom measurement:', error);
      alert('Failed to create custom measurement: ' + error.message);
      return;
    }

    // Reset form
    setShowCreateMeasurement(false);
    setCreateMeasurementName('');
    setCreateMeasurementCategory('single');
    setCreatePrimaryMetricName('');
    setCreatePrimaryMetricType('performance_decimal');
    setCreateSecondaryMetricName('');
    setCreateSecondaryMetricType('performance_decimal');

    // Refresh measurements
    await fetchCustomMeasurements();
    onUpdate();

    const typeLabel = createMeasurementCategory === 'paired' ? 'paired measurement' : 'measurement';
    alert(`Custom ${typeLabel} "${newMeasurement.name}" created! Now you can use it in exercises.`);
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

    const supabase = createClient();

    // Create a "system" exercise to hold this tag definition
    // This ensures the tag persists in the database
    const systemExerciseName = `_tag_definition_${newTagName}_${Date.now()}`;

    const { error } = await supabase
      .from('exercises')
      .insert({
        name: systemExerciseName,
        category: 'strength_conditioning',
        is_active: true,
        metric_schema: { measurements: [] },
        tags: ['_system', newTagName] // Include both _system and the new tag
      });

    if (error) {
      console.error('Error creating custom tag:', error);
      alert('Failed to create custom tag: ' + error.message);
      return;
    }

    // Reset form
    setShowCreateTag(false);
    setCreateTagName('');

    // Refresh tags
    await fetchTags();
    onUpdate();

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
        { id: 'reps', name: 'Reps', type: 'reps', unit: 'reps', enabled: true },
        { id: 'weight', name: 'Weight', type: 'performance_decimal', unit: 'lbs', enabled: true },
        { id: 'time', name: 'Time', type: 'performance_integer', unit: 'seconds', enabled: true },
        { id: 'distance', name: 'Distance', type: 'performance_decimal', unit: 'ft/yds', enabled: true },
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
                ? 'text-[#9BDDFF] border-[#9BDDFF]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Custom Measurements
          </button>
          <button
            onClick={() => setActiveTab('placeholders')}
            className={`px-4 py-3 font-medium transition-all border-b-2 ${
              activeTab === 'placeholders'
                ? 'text-[#9BDDFF] border-[#9BDDFF]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Placeholders
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="text-gray-400 mt-4">Loading...</p>
            </div>
          ) : (
            <>
              {activeTab === 'measurements' ? (
            // Measurements Tab
            <div className="space-y-4">
              {/* Create New Measurement Button/Form */}
              {showCreateMeasurement ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <h4 className="text-white font-semibold mb-2">Create New Custom Measurement</h4>
                  <p className="text-xs text-gray-400 mb-4">
                    Custom measurements will be available in all exercises.
                  </p>
                  <div className="space-y-3">
                    {/* Measurement Name */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Name *</label>
                      <input
                        type="text"
                        value={createMeasurementName}
                        onChange={(e) => setCreateMeasurementName(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                        placeholder="e.g., Blue Ball (450g), Jump Height"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Category *</label>
                      <select
                        value={createMeasurementCategory}
                        onChange={(e) => setCreateMeasurementCategory(e.target.value as 'single' | 'paired')}
                        className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                      >
                        <option value="single" className="bg-neutral-900 text-white">Single Metric</option>
                        <option value="paired" className="bg-neutral-900 text-white">Paired Metrics (e.g., Reps + MPH)</option>
                      </select>
                    </div>

                    {/* Single Metric Form */}
                    {createMeasurementCategory === 'single' && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Measurement Name/Unit *</label>
                            <input
                              type="text"
                              value={createPrimaryMetricName}
                              onChange={(e) => setCreatePrimaryMetricName(e.target.value)}
                              className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                              placeholder="e.g., lbs, mph, inches"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Type *</label>
                            <select
                              value={createPrimaryMetricType}
                              onChange={(e) => setCreatePrimaryMetricType(e.target.value as any)}
                              className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                            >
                              <option value="integer" className="bg-neutral-900 text-white">Integer</option>
                              <option value="decimal" className="bg-neutral-900 text-white">Decimal</option>
                              <option value="time" className="bg-neutral-900 text-white">Time</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Paired Metrics Form */}
                    {createMeasurementCategory === 'paired' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Primary Metric */}
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                            <p className="text-xs text-blue-400 font-semibold mb-2">Primary Metric</p>
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Name *</label>
                                <input
                                  type="text"
                                  value={createPrimaryMetricName}
                                  onChange={(e) => setCreatePrimaryMetricName(e.target.value)}
                                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                                  placeholder="e.g., Reps"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Type *</label>
                                <select
                                  value={createPrimaryMetricType}
                                  onChange={(e) => setCreatePrimaryMetricType(e.target.value as any)}
                                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                                >
                                  <option value="integer" className="bg-neutral-900 text-white">Integer</option>
                                  <option value="decimal" className="bg-neutral-900 text-white">Decimal</option>
                                  <option value="time" className="bg-neutral-900 text-white">Time</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Secondary Metric */}
                          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                            <p className="text-xs text-purple-400 font-semibold mb-2">Secondary Metric (Intensity Target)</p>
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Name *</label>
                                <input
                                  type="text"
                                  value={createSecondaryMetricName}
                                  onChange={(e) => setCreateSecondaryMetricName(e.target.value)}
                                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                                  placeholder="e.g., MPH"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Type *</label>
                                <select
                                  value={createSecondaryMetricType}
                                  onChange={(e) => setCreateSecondaryMetricType(e.target.value as any)}
                                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                                >
                                  <option value="integer" className="bg-neutral-900 text-white">Integer</option>
                                  <option value="decimal" className="bg-neutral-900 text-white">Decimal</option>
                                  <option value="time" className="bg-neutral-900 text-white">Time</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                          <p className="text-xs text-yellow-300">
                            <strong>Example:</strong> For "Blue Ball (450g)", use Primary: "Reps" | Secondary: "MPH"
                          </p>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                          <p className="text-xs text-blue-300">
                            <strong>Note:</strong> The secondary metric is the one affected by intensity % targets (only applies to decimal/time types, not integer)
                          </p>
                        </div>
                      </>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={createCustomMeasurement}
                        className="flex-1 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all text-sm font-medium"
                      >
                        Create {createMeasurementCategory === 'paired' ? 'Paired Measurement' : 'Measurement'}
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateMeasurement(false);
                          setCreateMeasurementName('');
                          setCreateMeasurementCategory('single');
                          setCreateMeasurementType('performance_decimal');
                          setCreateMeasurementUnit('');
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
                  className="w-full px-4 py-3 bg-[#9BDDFF]/20 border border-[#9BDDFF]/50 text-[#9BDDFF] rounded-lg hover:bg-[#9BDDFF]/30 transition-all font-medium"
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
                        {editCategory === 'single' ? (
                          // Single Measurement Edit
                          <>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Measurement Name/Unit</label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                                placeholder="e.g., lbs, mph, inches"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Type</label>
                              <select
                                value={editType}
                                onChange={(e) => setEditType(e.target.value as any)}
                                className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                              >
                                <option value="integer" className="bg-neutral-900 text-white">Integer</option>
                                <option value="decimal" className="bg-neutral-900 text-white">Decimal</option>
                                <option value="time" className="bg-neutral-900 text-white">Time</option>
                              </select>
                            </div>
                          </>
                        ) : (
                          // Paired Measurement Edit
                          <div className="grid grid-cols-2 gap-3">
                            {/* Primary Metric */}
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                              <p className="text-xs text-blue-400 font-semibold mb-2">Primary Metric</p>
                              <div className="space-y-2">
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Name *</label>
                                  <input
                                    type="text"
                                    value={editPrimaryName}
                                    onChange={(e) => setEditPrimaryName(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-neutral-900 border border-white/10 rounded text-white text-xs"
                                    placeholder="e.g., Reps"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Type *</label>
                                  <select
                                    value={editPrimaryType}
                                    onChange={(e) => setEditPrimaryType(e.target.value as any)}
                                    className="w-full px-2 py-1.5 bg-neutral-900 border border-white/10 rounded text-white text-xs"
                                  >
                                    <option value="integer" className="bg-neutral-900 text-white">Integer</option>
                                    <option value="decimal" className="bg-neutral-900 text-white">Decimal</option>
                                    <option value="time" className="bg-neutral-900 text-white">Time</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Secondary Metric */}
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                              <p className="text-xs text-purple-400 font-semibold mb-2">Secondary Metric</p>
                              <div className="space-y-2">
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Name *</label>
                                  <input
                                    type="text"
                                    value={editSecondaryName}
                                    onChange={(e) => setEditSecondaryName(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-neutral-900 border border-white/10 rounded text-white text-xs"
                                    placeholder="e.g., MPH"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Type *</label>
                                  <select
                                    value={editSecondaryType}
                                    onChange={(e) => setEditSecondaryType(e.target.value as any)}
                                    className="w-full px-2 py-1.5 bg-neutral-900 border border-white/10 rounded text-white text-xs"
                                  >
                                    <option value="integer" className="bg-neutral-900 text-white">Integer</option>
                                    <option value="decimal" className="bg-neutral-900 text-white">Decimal</option>
                                    <option value="time" className="bg-neutral-900 text-white">Time</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
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
            // Placeholders Tab
            <div className="space-y-4">
              {/* Create New Placeholder Button/Form */}
              {showCreatePlaceholder ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <h4 className="text-white font-semibold mb-3">Create New Placeholder</h4>
                  <p className="text-xs text-gray-400 mb-4">
                    Placeholders are exercise templates that can be filled with specific exercises when building plans.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Placeholder Name *</label>
                      <input
                        type="text"
                        value={createPlaceholderName}
                        onChange={(e) => setCreatePlaceholderName(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                        placeholder="e.g., Main Throwing Exercise, Corrective Exercise 1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Category *</label>
                      <select
                        value={createPlaceholderCategory}
                        onChange={(e) => setCreatePlaceholderCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                      >
                        <option value="strength_conditioning" className="bg-neutral-900 text-white">Strength + Conditioning</option>
                        <option value="hitting" className="bg-neutral-900 text-white">Hitting</option>
                        <option value="throwing" className="bg-neutral-900 text-white">Throwing</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">This helps filter exercises when replacing the placeholder</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
                      <textarea
                        value={createPlaceholderDescription}
                        onChange={(e) => setCreatePlaceholderDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm resize-none"
                        rows={2}
                        placeholder="e.g., Athlete selects their primary throwing movement"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={createPlaceholder}
                        className="flex-1 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all text-sm font-medium"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowCreatePlaceholder(false);
                          setCreatePlaceholderName('');
                          setCreatePlaceholderCategory('strength_conditioning');
                          setCreatePlaceholderDescription('');
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
                  onClick={() => setShowCreatePlaceholder(true)}
                  className="w-full px-4 py-3 bg-[#9BDDFF]/20 border border-[#9BDDFF]/50 text-[#9BDDFF] rounded-lg hover:bg-[#9BDDFF]/30 transition-all font-medium"
                >
                  + Create New Placeholder
                </button>
              )}

              {/* List of placeholders */}
              <div className="space-y-3">
                {placeholders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-5xl mb-4">📝</div>
                    <p className="text-lg font-medium">No placeholders yet</p>
                    <p className="text-sm mt-2">Create a placeholder to use in your workout plans</p>
                  </div>
                ) : (
                  placeholders.map((placeholder) => (
                    <div
                      key={placeholder.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                    >
                      {editingPlaceholder === placeholder.id ? (
                        // Edit Mode
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Placeholder Name</label>
                            <input
                              type="text"
                              value={editPlaceholderName}
                              onChange={(e) => setEditPlaceholderName(e.target.value)}
                              className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Category</label>
                            <select
                              value={editPlaceholderCategory}
                              onChange={(e) => setEditPlaceholderCategory(e.target.value)}
                              className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm"
                            >
                              <option value="strength_conditioning" className="bg-neutral-900 text-white">Strength + Conditioning</option>
                              <option value="hitting" className="bg-neutral-900 text-white">Hitting</option>
                              <option value="throwing" className="bg-neutral-900 text-white">Throwing</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Description</label>
                            <textarea
                              value={editPlaceholderDescription}
                              onChange={(e) => setEditPlaceholderDescription(e.target.value)}
                              className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded text-white text-sm resize-none"
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleUpdatePlaceholder(placeholder.id)}
                              className="flex-1 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all text-sm font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingPlaceholder(null)}
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
                              <h3 className="text-white font-semibold text-lg">{placeholder.name}</h3>
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium border border-blue-500/50">
                                PH
                              </span>
                            </div>
                            <div className="text-sm text-gray-400 mb-1">
                              Category: <span className="text-gray-300 capitalize">{placeholder.category.replace('_', ' ')}</span>
                            </div>
                            {placeholder.description && (
                              <div className="text-sm text-gray-400 italic mt-2">
                                {placeholder.description}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingPlaceholder(placeholder.id);
                                setEditPlaceholderName(placeholder.name);
                                setEditPlaceholderCategory(placeholder.category);
                                setEditPlaceholderDescription(placeholder.description || '');
                              }}
                              className="p-2 hover:bg-blue-500/20 rounded-lg transition-all group"
                              title="Edit placeholder"
                            >
                              <svg className="w-5 h-5 text-blue-400 group-hover:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeletePlaceholder(placeholder.id)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-all group"
                              title="Delete placeholder"
                            >
                              <svg className="w-5 h-5 text-red-400 group-hover:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
              )}
            </>
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
