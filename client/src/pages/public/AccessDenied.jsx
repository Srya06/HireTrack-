import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button.jsx';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AccessDenied() {
  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Denied (403)</h2>
        <p className="text-sm text-slate-600">
          You do not have permission to access this resource or page. Please verify your role or contact the placement cell administrator.
        </p>
        <div className="pt-2">
          <Link to="/">
            <Button variant="primary" size="sm" icon={ArrowLeft}>
              Return to Safety
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

