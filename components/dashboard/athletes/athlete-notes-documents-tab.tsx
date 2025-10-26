'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface NotesDocumentsTabProps {
  athleteId: string;
}

export default function AthleteNotesDocumentsTab({ athleteId }: NotesDocumentsTabProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
    fetchDocuments();
    getCurrentUser();
  }, [athleteId]);

  async function getCurrentUser() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  }

  async function fetchNotes() {
    const supabase = createClient();

    const { data: notesData, error: notesError } = await supabase
      .from('crm_notes')
      .select(`
        *,
        profiles:created_by(first_name, last_name)
      `)
      .eq('target_type', 'athlete')
      .eq('target_id', athleteId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    console.log('Notes:', notesData, notesError);
    setNotes(notesData || []);
    setLoading(false);
  }

  async function fetchDocuments() {
    const supabase = createClient();

    const { data: documentsData, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false });

    console.log('Documents:', documentsData, documentsError);
    setDocuments(documentsData || []);
  }

  async function handleSubmitNote(e: React.FormEvent) {
    e.preventDefault();

    if (!subject.trim() || !body.trim()) {
      alert('Please fill in both subject and body');
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('You must be logged in to add notes');
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from('crm_notes')
      .insert({
        target_type: 'athlete',
        target_id: athleteId,
        subject: subject.trim(),
        body: body.trim(),
        is_pinned: isPinned,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      alert('Failed to create note: ' + error.message);
    } else {
      console.log('Note created:', data);
      setSubject('');
      setBody('');
      setIsPinned(false);
      fetchNotes();
    }

    setSubmitting(false);
  }

  async function togglePin(noteId: string, currentPinStatus: boolean) {
    const supabase = createClient();

    const { error } = await supabase
      .from('crm_notes')
      .update({ is_pinned: !currentPinStatus })
      .eq('id', noteId);

    if (error) {
      console.error('Error toggling pin:', error);
      alert('Failed to update note');
    } else {
      fetchNotes();
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm('Delete this note? This cannot be undone.')) return;

    const supabase = createClient();

    const { error } = await supabase
      .from('crm_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note');
    } else {
      fetchNotes();
    }
  }

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return '📄';
    if (fileType.includes('pdf')) return '📕';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('word') || fileType.includes('doc')) return '📘';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    return '📄';
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const groupByFolder = (docs: any[]) => {
    const grouped: { [key: string]: any[] } = {
      'Waivers': [],
      'Medical': [],
      'Contracts': [],
      'Assessments': [],
      'Other': []
    };

    docs.forEach(doc => {
      const folder = doc.folder || 'Other';
      if (grouped[folder]) {
        grouped[folder].push(doc);
      } else {
        grouped['Other'].push(doc);
      }
    });

    return grouped;
  };

  const pinnedNotes = notes.filter(n => n.is_pinned);
  const unpinnedNotes = notes.filter(n => !n.is_pinned);
  const groupedDocs = groupByFolder(documents);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#9BDDFF] border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading notes and documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* NOTES SECTION */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Notes</h2>

        {/* Add Note Form */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Note</h3>
          <form onSubmit={handleSubmitNote} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief subject line..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Note</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add detailed notes about this athlete..."
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF] focus:border-transparent resize-none"
                disabled={submitting}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pin-note"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-white/5"
                disabled={submitting}
              />
              <label htmlFor="pin-note" className="text-sm text-gray-400 cursor-pointer">
                Pin this note (keep it at the top)
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save Note'}
            </button>
          </form>
        </div>

        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#9BDDFF]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c-.25.78-.03 1.632.584 2.15.613.519 1.512.667 2.288.37l.702-.267-.848-2.65-1.905-.755z" />
              </svg>
              Pinned Notes
            </h3>
            <div className="space-y-3">
              {pinnedNotes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  currentUserId={currentUserId}
                  onTogglePin={togglePin}
                  onDelete={deleteNote}
                  formatRelativeTime={formatRelativeTime}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Notes */}
        <div>
          {unpinnedNotes.length > 0 && <h3 className="text-lg font-semibold text-white mb-3">All Notes</h3>}
          {unpinnedNotes.length === 0 && pinnedNotes.length === 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-gray-400 text-lg">No notes yet</p>
              <p className="text-sm text-gray-500 mt-2">Add your first note using the form above</p>
            </div>
          )}
          <div className="space-y-3">
            {unpinnedNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                currentUserId={currentUserId}
                onTogglePin={togglePin}
                onDelete={deleteNote}
                formatRelativeTime={formatRelativeTime}
              />
            ))}
          </div>
        </div>
      </div>

      {/* DOCUMENTS SECTION */}
      <div className="border-t border-white/10 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Documents</h2>
          <button
            onClick={() => alert('Upload functionality - Coming soon\n\nWill include:\n- Drag & drop file upload\n- Multiple file selection\n- Supabase Storage integration\n- Progress indicators')}
            className="px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black font-semibold rounded-lg transition-all"
          >
            + Upload Document
          </button>
        </div>

        {/* Upload Area */}
        <div
          className="bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-[#9BDDFF]/50 transition-colors cursor-pointer mb-6"
          onClick={() => alert('Upload functionality - Coming soon')}
        >
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-white font-medium mb-2">Drop files here or click to browse</p>
          <p className="text-sm text-gray-400">Support for PDF, images, videos, and documents</p>
        </div>

        {documents.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 text-lg mb-2">No Documents Yet</p>
            <p className="text-gray-500 text-sm">Upload waivers, medical forms, contracts, and assessments</p>
          </div>
        ) : (
          <>
            {Object.entries(groupedDocs).map(([folder, docs]) => {
              if (docs.length === 0) return null;

              return (
                <div key={folder} className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#9BDDFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {folder} ({docs.length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {docs.map(doc => (
                      <div key={doc.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="text-4xl">{getFileIcon(doc.file_type)}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium truncate mb-1">{doc.name}</h4>
                            <p className="text-sm text-gray-400 mb-3">
                              {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => alert('Download functionality - Coming soon')}
                                className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors"
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note, currentUserId, onTogglePin, onDelete, formatRelativeTime }: any) {
  const canEdit = currentUserId === note.created_by;
  const authorName = note.profiles
    ? `${note.profiles.first_name || ''} ${note.profiles.last_name || ''}`.trim()
    : 'Unknown';

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-white font-semibold">{note.subject}</h4>
            {note.is_pinned && (
              <svg className="w-4 h-4 text-[#9BDDFF]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c-.25.78-.03 1.632.584 2.15.613.519 1.512.667 2.288.37l.702-.267-.848-2.65-1.905-.755z" />
              </svg>
            )}
          </div>
          <p className="text-sm text-gray-400">
            {authorName} · {formatRelativeTime(note.created_at)}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => onTogglePin(note.id, note.is_pinned)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={note.is_pinned ? 'Unpin' : 'Pin'}
            >
              <svg
                className={`w-5 h-5 ${note.is_pinned ? 'text-[#9BDDFF]' : 'text-gray-400'}`}
                fill={note.is_pinned ? 'currentColor' : 'none'}
                viewBox="0 0 20 20"
                stroke="currentColor"
              >
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c-.25.78-.03 1.632.584 2.15.613.519 1.512.667 2.288.37l.702-.267-.848-2.65-1.905-.755z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(note.id)}
              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <p className="text-white whitespace-pre-wrap">{note.body}</p>
    </div>
  );
}
