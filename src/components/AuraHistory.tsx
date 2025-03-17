import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuraProposal, User } from '../types';
import { ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { useTranslation } from "react-i18next";

interface AuraHistoryProps {
  userId: string;
}

interface ExtendedProposal extends AuraProposal {
  proposer: User;
}

export default function AuraHistory({ userId }: AuraHistoryProps) {
  const [proposals, setProposals] = useState<ExtendedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetchAuraHistory();
  }, [userId]);

  const fetchAuraHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('aura_proposals')
        .select(`
          *,
          proposer:profiles!aura_proposals_proposer_id_fkey(*)
        `)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (err) {
      console.error('Error fetching aura history:', err);
      setError('Errore nel caricamento dello storico');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string, value: number) => {
    switch (status) {
      case 'approved':
        return (
            <div className={`p-2 rounded-full ${
            value > 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
            {value > 0 ? (
              <ThumbsUp className="w-5 h-5 text-green-600" />
            ) : (
              <ThumbsDown className="w-5 h-5 text-red-600" />
            )}
            </div>
        );
      case 'rejected':
        return (
          <div className="p-2 bg-gray-100 rounded-full">
            <ThumbsDown className="w-5 h-5 text-gray-600" />
          </div>
        );
      default:
        return (
          <div className="p-2 bg-yellow-100 rounded-full">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-t-purple-600 border-b-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600 bg-red-100 rounded-md">
        {error}
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
        <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p className="mb-2 text-lg font-medium">{t('noEdit')}</p>
        <p>{t('noEditInfo')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.map((proposal) => (
        <div key={proposal.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-start space-x-4">
            {getStatusIcon(proposal.status, proposal.value)}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0">
                    {proposal.proposer?.avatar ? (
                      <img
                        src={proposal.proposer.avatar}
                        alt={proposal.proposer.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center">
                        <span className="text-purple-700 font-medium">
                          {proposal.proposer?.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="font-medium">{proposal.proposer?.username}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(proposal.created_at).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-center mb-1">
                  <span className="text-sm text-gray-600 mr-2">{t('editProposal')}</span>
                  <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${
                    proposal.value > 0 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {proposal.value > 0 ? '+' : ''}{proposal.value}
                  </span>
                </div>
                <p className="text-gray-700">{proposal.reason}</p>
                <div className="mt-2">
                  <span className={`text-sm font-medium ${
                    proposal.status === 'approved'
                      ? 'text-green-600'
                      : proposal.status === 'rejected'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`}>
                    {proposal.status === 'approved'
                      ? t('approved')
                      : proposal.status === 'rejected'
                      ? t('rejected')
                      : t('pending')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}