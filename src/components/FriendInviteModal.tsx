import React, { useState } from 'react';
import { X, Search, Clock, Check, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { User, FriendRequest } from '../types';

interface FriendInviteModalProps {
  onClose: () => void;
  onInviteSent: () => void;
}

export default function FriendInviteModal({ onClose, onInviteSent }: FriendInviteModalProps) {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(*),
          recipient:profiles!friend_requests_recipient_id_fkey(*)
        `)
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    }
  };

  const handleSearch = async (searchTerm: string) => {
    setUsername(searchTerm);
    if (searchTerm.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${searchTerm}%`)
        .neq('id', user?.id)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  const handleSendRequest = async (recipientId: string) => {
    setError(null);
    setLoading(true);

    try {
      // Check if already friends or has pending request
      const { data: existingRequest, error: checkError } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user?.id})`)
        .eq('status', 'pending')
        .maybeSingle();

      if (checkError) throw checkError;
      
      if (existingRequest) {
        setError('Esiste già una richiesta di amicizia in sospeso');
        setLoading(false);
        return;
      }

      // Send friend request
      const { error: sendError } = await supabase
        .from('friend_requests')
        .insert([
          { 
            sender_id: user?.id, 
            recipient_id: recipientId
          }
        ]);

      if (sendError) throw sendError;

      setSuccess(true);
      await fetchPendingRequests();
      setTimeout(() => {
        onInviteSent();
      }, 1500);
    } catch (err) {
      console.error('Error sending friend request:', err);
      setError('Errore nell\'invio della richiesta di amicizia');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', requestId);

      if (error) throw error;
      
      await fetchPendingRequests();
      if (accept) {
        onInviteSent(); // Refresh friends list in parent component
      }
    } catch (err) {
      console.error('Error handling friend request:', err);
      setError('Errore nella gestione della richiesta');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Gestione Amicizie</h2>
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

        {success ? (
          <div className="p-3 mb-4 text-sm text-green-600 bg-green-100 rounded-md">
            Richiesta di amicizia inviata con successo!
          </div>
        ) : (
          <>
            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Richieste in sospeso</h3>
                <div className="space-y-3">
                  {pendingRequests.map((request) => {
                    const isReceived = request.recipient_id === user?.id;
                    const otherUser = isReceived ? request.sender : request.recipient;
                    
                    return (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {otherUser?.avatar ? (
                            <img
                              src={otherUser.avatar}
                              alt={otherUser.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center">
                              <span className="text-purple-700 font-medium">
                                {otherUser?.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{otherUser?.username}</p>
                            <p className="text-sm text-gray-500">
                              {isReceived ? 'Ti ha inviato una richiesta' : 'Richiesta inviata'}
                            </p>
                          </div>
                        </div>
                        {isReceived ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleRequestAction(request.id, true)}
                              className="p-2 text-green-600 bg-green-100 rounded-full hover:bg-green-200"
                              title="Accetta"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleRequestAction(request.id, false)}
                              className="p-2 text-red-600 bg-red-100 rounded-full hover:bg-red-200"
                              title="Rifiuta"
                            >
                              <Ban className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Cerca nuovi amici</h3>
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Cerca per username..."
                />
              </div>

              {searchResults.length > 0 ? (
                <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <li key={result.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {result.avatar ? (
                            <img
                              src={result.avatar}
                              alt={result.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center">
                              <span className="text-purple-700 font-medium">
                                {result.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="ml-3">
                            <p className="font-medium">{result.username}</p>
                            <p className="text-sm text-gray-500">Aura: {result.aura}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSendRequest(result.id)}
                          disabled={loading || pendingRequests.some(r => 
                            (r.sender_id === user?.id && r.recipient_id === result.id) ||
                            (r.recipient_id === user?.id && r.sender_id === result.id)
                          )}
                          className="px-3 py-1 text-sm text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {pendingRequests.some(r => 
                            (r.sender_id === user?.id && r.recipient_id === result.id) ||
                            (r.recipient_id === user?.id && r.sender_id === result.id)
                          ) ? 'Richiesta pendente' : 'Invia richiesta'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : username.length >= 3 ? (
                <div className="text-center py-4 text-gray-500">
                  Nessun utente trovato
                </div>
              ) : username.length > 0 ? (
                <div className="text-center py-4 text-gray-500">
                  Inserisci almeno 3 caratteri per cercare
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}