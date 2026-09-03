import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

function formatDateToYYYYMMDD(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDefaultFromDate() {
  const d = new Date();
  const targetMonth = d.getMonth() - 1;
  d.setMonth(targetMonth);
  if (d.getMonth() === (targetMonth + 2) % 12) {
    d.setDate(0);
  }
  return formatDateToYYYYMMDD(d);
}

function getDefaultToDate() {
  return formatDateToYYYYMMDD(new Date());
}

export default function ExportPage() {
  const [fromDate, setFromDate] = useState(getDefaultFromDate);
  const [toDate, setToDate] = useState(getDefaultToDate);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null); // 'range' | 'all' | null
  const [status, setStatus] = useState(null);

  const handleExport = async (isRange) => {
    setIsLoading(true);
    setLoadingAction(isRange ? 'range' : 'all');
    setStatus(null);

    try {
      let ticketsQuery = supabase.from('tickets').select('*');
      let messagesQuery = supabase.from('messages').select('*');
      let projectsQuery = supabase.from('projects').select('*');
      let updatesQuery = supabase.from('project_updates').select('*');

      if (isRange) {
        if (!fromDate || !toDate) {
          setStatus({ type: 'error', message: 'Please select both From and To dates.' });
          setIsLoading(false);
          setLoadingAction(null);
          return;
        }

        const startIso = new Date(`${fromDate}T00:00:00`).toISOString();
        const endIso = new Date(`${toDate}T23:59:59.999`).toISOString();

        ticketsQuery = ticketsQuery.gte('created_at', startIso).lte('created_at', endIso);
        messagesQuery = messagesQuery.gte('created_at', startIso).lte('created_at', endIso);
        projectsQuery = projectsQuery.gte('created_at', startIso).lte('created_at', endIso);
        updatesQuery = updatesQuery.gte('created_at', startIso).lte('created_at', endIso);
      }

      const [
        { data: tickets, error: ticketsErr },
        { data: messages, error: messagesErr },
        { data: projects, error: projectsErr },
        { data: updates, error: updatesErr }
      ] = await Promise.all([
        ticketsQuery.order('created_at', { ascending: false }),
        messagesQuery.order('created_at', { ascending: false }),
        projectsQuery.order('created_at', { ascending: false }),
        updatesQuery.order('created_at', { ascending: false })
      ]);

      if (ticketsErr) console.error('Error querying tickets:', ticketsErr);
      if (messagesErr) console.error('Error querying messages:', messagesErr);
      if (projectsErr) console.error('Error querying projects:', projectsErr);
      if (updatesErr) console.error('Error querying project_updates:', updatesErr);

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1 'Tickets': all ticket fields
      const wsTickets = XLSX.utils.json_to_sheet(tickets || []);
      XLSX.utils.book_append_sheet(wb, wsTickets, 'Tickets');

      // Sheet 2 'Ticket Replies': all message fields
      const wsMessages = XLSX.utils.json_to_sheet(messages || []);
      XLSX.utils.book_append_sheet(wb, wsMessages, 'Ticket Replies');

      // Sheet 3 'Reports': all project fields
      const wsProjects = XLSX.utils.json_to_sheet(projects || []);
      XLSX.utils.book_append_sheet(wb, wsProjects, 'Reports');

      // Sheet 4 'Report Updates': all project_updates fields
      const wsUpdates = XLSX.utils.json_to_sheet(updates || []);
      XLSX.utils.book_append_sheet(wb, wsUpdates, 'Report Updates');

      // Sheet 5 'Report Update Replies': (same as Report Updates, for compatibility)
      const wsUpdateReplies = XLSX.utils.json_to_sheet(updates || []);
      XLSX.utils.book_append_sheet(wb, wsUpdateReplies, 'Report Update Replies');

      // Generate filename and trigger download
      const fileName = isRange
        ? `export_${fromDate}_to_${toDate}.xlsx`
        : `export_everything_${formatDateToYYYYMMDD(new Date())}.xlsx`;

      XLSX.writeFile(wb, fileName);
      setStatus({ type: 'success', message: `Workbook exported successfully as "${fileName}".` });
    } catch (err) {
      console.error('Export failed:', err);
      setStatus({ type: 'error', message: `Failed to export workbook: ${err.message || 'Unknown error'}` });
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: '#f0f2f5' }}>
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Export</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base leading-relaxed">
            Download every query ticket and project report — including all replies and status updates — raised or resolved within a date range, as an Excel workbook.
          </p>
        </div>

        {/* White Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sm:p-8">
          {/* Date range inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="export-from-date" className="block text-sm font-medium text-gray-700 mb-1.5">
                From
              </label>
              <input
                id="export-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="export-to-date" className="block text-sm font-medium text-gray-700 mb-1.5">
                To
              </label>
              <input
                id="export-to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleExport(true)}
              disabled={isLoading}
              style={{ backgroundColor: '#1e3a5f' }}
              className="px-4 py-2.5 text-white text-sm font-medium rounded-md hover:opacity-90 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading && loadingAction === 'range' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Excel for this range</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleExport(false)}
              disabled={isLoading}
              className="px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 hover:text-gray-900 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading && loadingAction === 'all' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-gray-500" />
                  <span>Download everything</span>
                </>
              )}
            </button>
          </div>

          {/* Note text */}
          <p className="text-xs text-gray-500 leading-relaxed">
            The workbook has five sheets: Tickets, Ticket Replies, Reports, Report Updates, and Report Update Replies. A ticket or report is included if it was raised or resolved in the range; a reply or update is included if it was posted in the range.
          </p>

          {/* Status Message */}
          {status && (
            <div
              className={`mt-4 p-3 rounded-md text-sm flex items-start gap-2 ${
                status.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}
            >
              {status.type === 'error' ? (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span>{status.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
