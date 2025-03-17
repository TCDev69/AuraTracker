import React, { useState, useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from "react-i18next";

interface ProfilePhotoUploaderProps {
  currentAvatar?: string | null;
  onPhotoUpdated: () => void;
}

export default function ProfilePhotoUploader({ currentAvatar, onPhotoUpdated }: ProfilePhotoUploaderProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 1MB)
    if (file.size > 1024 * 1024) {
      setError('La foto è troppo grande. Dimensione massima: 1MB');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert to base64
      const base64 = await convertToBase64(file);
      
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar: base64 })
        .eq('id', user?.id);

      if (updateError) throw updateError;
      
      onPhotoUpdated();
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Errore nel caricamento della foto');
    } finally {
      setLoading(false);
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
    <div className="text-center">
      <div className="relative inline-block">
        {currentAvatar ? (
          <img
            src={currentAvatar}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover mx-auto"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-purple-200 flex items-center justify-center mx-auto">
            <Camera className="w-8 h-8 text-purple-600" />
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="absolute bottom-0 right-0 p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50"
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
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {loading && <p className="mt-2 text-xs text-gray-500">Caricamento in corso...</p>}
    </div>
  );
}