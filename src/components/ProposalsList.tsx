import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AuraProposal, ProposalVote, CombinedFriend } from '../types';
import { ThumbsUp, ThumbsDown, Check, X, Clock } from 'lucide-react';
import { useTranslation } from "react-i18next";

interface ProposalsListProps {
  combinedFriends: CombinedFriend[];
  onProposalAction: () => void;
}

export default function ProposalsList({ combinedFriends, onProposalAction }: ProposalsListProps) {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<AuraProposal[]>([]);
  const [votes, setVotes] = useState<Record<string, ProposalVote | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votingInProgress, setVotingInProgress] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetchProposals();
  }, [user]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      
      // Fetch all proposals
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('aura_proposals')
        .select(`
          *,
          proposer:profiles!aura_proposals_proposer_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (proposalsError) throw proposalsError;

      // Fetch votes for each proposal
      const { data: votesData, error: votesError } = await supabase
        .from('proposal_votes')
        .select(`
          *,
          voter:profiles!proposal_votes_voter_id_fkey(*)
        `)
        .in('proposal_id', proposalsData.map(p => p.id));

      if (votesError) throw votesError;

      // Count votes for each proposal
      const proposalsWithVotes = proposalsData.map(proposal => {
        const proposalVotes = votesData.filter(v => v.proposal_id === proposal.id);
        const approveVotes = proposalVotes.filter(v => v.vote).length;
        
        // Find recipient name and avatar
        let recipientName = '';
        let recipientAvatar = null;
        
        if (proposal.is_recipient_offline) {
          const offlineFriend = combinedFriends.find(f => f.id === proposal.recipient_id && f.is_offline);
          if (offlineFriend) {
            recipientName = offlineFriend.name;
            recipientAvatar = offlineFriend.avatar;
          }
        } else {
          const onlineFriend = combinedFriends.find(f => f.id === proposal.recipient_id && !f.is_offline);
          if (onlineFriend) {
            recipientName = onlineFriend.name;
            recipientAvatar = onlineFriend.avatar;
          }
        }
        
        return {
          ...proposal,
          recipient_name: recipientName,
          recipient_avatar: recipientAvatar,
          total_votes: proposalVotes.length,
          approve_votes: approveVotes
        };
      });

      // Get user's votes
      const userVotes: Record<string, ProposalVote | null> = {};
      proposalsData.forEach(proposal => {
        const userVote = votesData.find(v => v.proposal_id === proposal.id && v.voter_id === user?.id);
        userVotes[proposal.id] = userVote || null;
      });

      setProposals(proposalsWithVotes);
      setVotes(userVotes);
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError('Errore nel caricamento delle proposte');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: string, approve: boolean) => {
    try {
      setVotingInProgress(proposalId);
      
      // Check if user already voted
      if (votes[proposalId]) {
        // Update existing vote
        const { error: updateError } = await supabase
          .from('proposal_votes')
          .update({ vote: approve })
          .eq('id', votes[proposalId]?.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new vote
        const { error: insertError } = await supabase
          .from('proposal_votes')
          .insert([
            {
              proposal_id: proposalId,
              voter_id: user?.id,
              vote: approve
            }
          ]);
          
        if (insertError) throw insertError;
      }
      
      // Refresh proposals and votes
      await fetchProposals();
      onProposalAction();
    } catch (err) {
      console.error('Error voting on proposal:', err);
      setError('Errore durante il voto');
    } finally {
      setVotingInProgress(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check className="w-3 h-3 mr-1" />
            Approvata
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <X className="w-3 h-3 mr-1" />
            Respinta
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            In attesa
          </span>
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

  return (
    <div>
      {error && (
        <div className="p-3 mb-4 text-sm text-red-600 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {proposals.length === 0 ? (
        <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
          <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="mb-2 text-lg font-medium">Nessuna proposta</p>
          <p>Non ci sono proposte di modifica dell'aura al momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {proposal.proposer?.avatar ? (
                      <img
                        src={proposal.proposer.avatar}
                        alt={proposal.proposer.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center">
                        <span className="text-purple-700 font-medium">
                          {proposal.proposer?.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{proposal.proposer?.username}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(proposal.created_at).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                {getStatusBadge(proposal.status)}
              </div>

              <div className="p-3 mb-3 bg-gray-50 rounded-md">
                <div className="flex items-center mb-2">
                  <p className="text-sm text-gray-600">Propone una modifica per:</p>
                  <div className="flex items-center ml-2">
                    <div className="flex-shrink-0">
                      {proposal.recipient_avatar ? (
                        <img
                          src={proposal.recipient_avatar}
                          alt={proposal.recipient_name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center">
                          <span className="text-purple-700 text-xs font-medium">
                            {proposal.recipient_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="ml-1 font-medium text-sm">{proposal.recipient_name}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium">Valore:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    proposal.value > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {proposal.value > 0 ? '+' : ''}{proposal.value}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700">Motivazione:</p>
                <p className="mt-1 text-gray-600">{proposal.reason}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {proposal.total_votes} voti ({proposal.approve_votes} favorevoli)
                </div>
                
                {proposal.status === 'pending' && proposal.proposer_id !== user?.id && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleVote(proposal.id, true)}
                      disabled={votingInProgress === proposal.id}
                      className={`flex items-center px-3 py-1 text-sm rounded ${
                        votes[proposal.id]?.vote === true
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      Approva
                    </button>
                    <button
                      onClick={() => handleVote(proposal.id, false)}
                      disabled={votingInProgress === proposal.id}
                      className={`flex items-center px-3 py-1 text-sm rounded ${
                        votes[proposal.id]?.vote === false
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4 mr-1" />
                      Respingi
                    </button>
                  </div>
                )}
                
                {proposal.status === 'pending' && proposal.proposer_id === user?.id && (
                  <div className="text-sm text-gray-500 italic">
                    Hai già votato automaticamente a favore
                  </div>
                )}
                
                {proposal.status !== 'pending' && (
                  <div className="text-sm text-gray-500 italic">
                    Votazione conclusa
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}