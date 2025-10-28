'use client';

interface NotesDocumentsTabProps {
  athleteId: string;
}

export default function AthleteNotesDocumentsTab({ athleteId }: NotesDocumentsTabProps) {
  // Note: crm_notes and documents tables have been removed from the database
  // This is a placeholder for future notes/documents feature

  return (
    <div className="space-y-8 p-6">
      {/* Notes Section Placeholder */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
        <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <h3 className="text-xl font-semibold text-white mb-2">Notes & Documents</h3>
        <p className="text-gray-400">This feature is coming soon!</p>
        <p className="text-sm text-gray-500 mt-2">
          You'll be able to add notes and upload documents for each athlete.
        </p>
      </div>
    </div>
  );
}
