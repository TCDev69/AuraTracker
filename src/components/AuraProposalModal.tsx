import React, { useState } from 'react';
import { X, ThumbsUp, ThumbsDown, Plus, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CombinedFriend } from '../types';
import { useTranslation } from "react-i18next";

interface AuraProposalModalProps {
  friend: CombinedFriend;
  onClose: () => void;
  onProposalSubmitted: () => void;
}

const PRESET_VALUES = [1000, 500, 100];

export default function AuraProposalModal({ friend, onClose, onProposalSubmitted }: AuraProposalModalProps) {
  const { user } = useAuth();
  const [value, setValue] = useState<number>(1);
  const [customValue, setCustomValue] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!reason.trim()) {
      setError(t('errors.reasonRequired'));
      setLoading(false);
      return;
    }

    const finalValue = isCustom ? parseInt(customValue) : value;
    if (isNaN(finalValue)) {
      setError(t('errors.invalidValue'));
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('aura_proposals')
        .insert([
          { 
            proposer_id: user?.id, 
            recipient_id: friend.id,
            is_recipient_offline: friend.is_offline,
            value: finalValue,
            reason: reason.trim()
          }
        ]);

      if (insertError) throw insertError;
      
      // Auto-vote for your own proposal
      const { data: proposalData } = await supabase
        .from('aura_proposals')
        .select('id')
        .eq('proposer_id', user?.id)
        .eq('recipient_id', friend.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (proposalData) {
        await supabase
          .from('proposal_votes')
          .insert([
            {
              proposal_id: proposalData.id,
              voter_id: user?.id,
              vote: true
            }
          ]);
      }
      
      onProposalSubmitted();
    } catch (err) {
      console.error('Error creating proposal:', err);
      setError(t('errors.creatingProposal'));
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (newValue: number) => {
    setIsCustom(false);
    setValue(newValue);
  };

  const handleCustomValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCustom(true);
    setCustomValue(e.target.value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{t('proposeAura')}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700">
              {t('proposeAuraFor')}
            </p>
            <div className="flex items-center p-3 bg-gray-50 rounded-md">
              <div className="flex-shrink-0">
                {friend.avatar ? (
                  <img
                    src={friend.avatar}
                    alt={friend.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center">
                    <span className="text-purple-700 font-medium">
                      {friend.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-3">
                <p className="font-medium">{friend.name}</p>
                <p className="text-sm text-gray-500">{t('nowAura')} {friend.aura}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              {t('valueEdit')}
            </label>
            
            {/* Preset positive values */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {PRESET_VALUES.map((val) => (
                <button
                  key={`pos-${val}`}
                  type="button"
                  onClick={() => handleValueChange(val)}
                  className={`flex items-center justify-center px-3 py-2 text-sm rounded-md ${
                    !isCustom && value === val
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {val}
                </button>
              ))}
            </div>

            {/* Preset negative values */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {PRESET_VALUES.map((val) => (
                <button
                  key={`neg-${val}`}
                  type="button"
                  onClick={() => handleValueChange(-val)}
                  className={`flex items-center justify-center px-3 py-2 text-sm rounded-md ${
                    !isCustom && value === -val
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Minus className="w-4 h-4 mr-1" />
                  {val}
                </button>
              ))}
            </div>

            {/* Custom value input */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('customValue')}
              </label>
              <input
                type="number"
                value={customValue}
                onChange={handleCustomValueChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={t('addValue')}
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="reason" className="block mb-2 text-sm font-medium text-gray-700">
              Motivazione *
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder={t('reasonEdit')}
              rows={3}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('reasonEditInfo')}
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? t('sendLoading') : t('sendProposal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}