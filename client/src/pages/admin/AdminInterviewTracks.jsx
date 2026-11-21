import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Bot,
  Sliders,
  Archive
} from 'lucide-react';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import * as aiInterviewService from '../../services/aiInterview.service.js';

export default function AdminInterviewTracks() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    roleCategory: 'Software Engineering',
    description: '',
    interviewType: 'AI',
    questionConfig: {
      maxQuestions: 5,
      maxFollowUps: 1,
      maxTurnChars: 1000
    },
    rubricConfig: [
      {
        dimension: 'Technical Competence',
        maxScore: 10,
        description: 'Conceptual depth and accuracy',
        criteria: ['Concept clarity', 'Practical application']
      },
      {
        dimension: 'Problem Solving & Structure',
        maxScore: 10,
        description: 'Thought structuring and trade-offs',
        criteria: ['Structured answers', 'Trade-off analysis']
      },
      {
        dimension: 'Communication & Delivery',
        maxScore: 10,
        description: 'Clarity, conciseness, and articulation',
        criteria: ['Concise delivery']
      }
    ]
  });

  const loadTracks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiInterviewService.getAdminTracks({ limit: 50 });
      const items = Array.isArray(res.data?.data)
        ? res.data.data
        : res.data?.data?.items || [];
      setTracks(items);
    } catch (err) {
      setError(err.message || 'Failed to load interview tracks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTracks();
  }, []);

  const handleCreateTrack = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await aiInterviewService.createAdminTrack(formData);
      setShowCreateModal(false);
      setFormData({
        title: '',
        roleCategory: 'Software Engineering',
        description: '',
        interviewType: 'AI',
        questionConfig: { maxQuestions: 5, maxFollowUps: 1, maxTurnChars: 1000 },
        rubricConfig: [
          { dimension: 'Technical Competence', maxScore: 10, description: '', criteria: [] },
          { dimension: 'Problem Solving', maxScore: 10, description: '', criteria: [] }
        ]
      });
      loadTracks();
    } catch (err) {
      setError(err.message || 'Failed to create track');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveTrack = async (trackId) => {
    if (!window.confirm('Archive this interview track? Students will no longer be able to start new sessions.')) {
      return;
    }
    try {
      await aiInterviewService.archiveAdminTrack(trackId);
      loadTracks();
    } catch (err) {
      setError(err.message || 'Failed to archive track');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-indigo-600" />
            Interview Tracks & Rubric Authoring
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Author and configure role-specific AI practice tracks with structured evaluation rubrics and question bounds.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Create Interview Track
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading interview tracks...</p>
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 p-8 space-y-3">
          <Bot className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900">No interview tracks created yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create your first track to allow students to practice role-specific technical and HR interviews.
          </p>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Track
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-3.5 text-left">Track Title</th>
                <th className="px-6 py-3.5 text-left">Role Category</th>
                <th className="px-6 py-3.5 text-left">Type</th>
                <th className="px-6 py-3.5 text-left">Question Bounds</th>
                <th className="px-6 py-3.5 text-left">Rubric Dimensions</th>
                <th className="px-6 py-3.5 text-left">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tracks.map((track) => {
                const trackId = track._id || track.id;
                const qConf = track.questionConfig || {};
                const rubrics = track.rubricConfig || [];

                return (
                  <tr key={trackId} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {track.title}
                      {track.description && (
                        <p className="text-xs text-slate-400 font-normal line-clamp-1">{track.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700 font-medium">
                      {track.roleCategory}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        {track.interviewType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {qConf.maxQuestions || 5} Qs • {qConf.maxFollowUps || 1} Follow-up
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {rubrics.length} Dimensions
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          track.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {track.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {track.status !== 'ARCHIVED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchiveTrack(trackId)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Archive className="w-3.5 h-3.5 mr-1" /> Archive
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Track Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Create AI Interview Track</h3>

            <form onSubmit={handleCreateTrack} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Track Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SDE-1 Technical Practice (Campus 2026)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Role Category</label>
                <select
                  value={formData.roleCategory}
                  onChange={(e) => setFormData({ ...formData, roleCategory: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Frontend Development">Frontend Development</option>
                  <option value="Backend & Systems">Backend & Systems</option>
                  <option value="Data Science & ML">Data Science & ML</option>
                  <option value="Product & Analytics">Product & Analytics</option>
                  <option value="General HR & Behavioral">General HR & Behavioral</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the practice focus..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Question Config */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="font-medium text-slate-600 block mb-1">Max Questions</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={formData.questionConfig.maxQuestions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        questionConfig: { ...formData.questionConfig, maxQuestions: Number(e.target.value) }
                      })
                    }
                    className="w-full p-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600 block mb-1">Max Follow-ups</label>
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={formData.questionConfig.maxFollowUps}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        questionConfig: { ...formData.questionConfig, maxFollowUps: Number(e.target.value) }
                      })
                    }
                    className="w-full p-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600 block mb-1">Max Chars/Turn</label>
                  <input
                    type="number"
                    min={200}
                    max={3000}
                    value={formData.questionConfig.maxTurnChars}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        questionConfig: { ...formData.questionConfig, maxTurnChars: Number(e.target.value) }
                      })
                    }
                    className="w-full p-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Rubric Overview */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Rubric Dimensions ({formData.rubricConfig.length})
                </label>
                <div className="space-y-2">
                  {formData.rubricConfig.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="font-medium text-slate-800">{r.dimension}</span>
                      <span className="text-slate-500 font-bold">{r.maxScore} marks</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {submitting ? 'Creating...' : 'Create Track'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
