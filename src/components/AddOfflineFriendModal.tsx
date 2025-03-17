import React, { useState, useRef } from 'react';
import { X, Camera, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from "react-i18next";

interface AddOfflineFriendModalProps {
  onClose: () => void;
  onFriendAdded: () => void;
}

export default function AddOfflineFriendModal({ onClose, onFriendAdded }: AddOfflineFriendModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!name.trim()) {
      setError(t('errors.nameRequired'));
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('offline_friends')
        .insert([
          { 
            creator_id: user?.id, 
            name: name.trim(),
            avatar: avatar,
            aura: 0 // Valore iniziale
          }
        ]);

      if (insertError) throw insertError;
      
      onFriendAdded();
    } catch (err) {
      console.error('Error adding offline friend:', err);
      setError(t('errors.addFriends'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 1MB)
    if (file.size > 1024 * 1024) {
      setError(t('errors.fileSize'));
      return;
    }

    setError(null);

    try {
      // Convert to base64
      const base64 = await convertToBase64(file);
      setAvatar(base64);
    } catch (err) {
      console.error('Error processing photo:', err);
      setError(t('errors.processingPhoto'));
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{t('AddOfflineFriend')}</h2>
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
          <div className="mb-4 text-center">
            <div className="relative inline-block mb-4">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Avatar"
                  className="w-24 h-24 mx-auto rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 mx-auto rounded-full bg-purple-200 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-purple-600" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700"
              >
                <Upload className="w-4 h-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-700">
              {t('name')}
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder={t('nameFriend')}
              required
            />
          </div>

          <div className="mb-6">
            <p className="mt-1 text-xs text-gray-500">
              {t('OfflineFriendInfo')}
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? t('addLoading') : t('addFriend')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}