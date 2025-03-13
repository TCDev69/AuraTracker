import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { User, Friend, OfflineFriend, CombinedFriend } from '../types';
import { UserPlus, Users, LogOut, Award, ListPlus, History } from 'lucide-react';
import Sidebar from './Sidebar';
import ProfilePhotoUploader from './ProfilePhotoUploader';
import AuraProposalModal from './AuraProposalModal';
import ProposalsList from './ProposalsList';
import Leaderboard from './Leaderboard';
import AuraHistory from './AuraHistory';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [offlineFriends, setOfflineFriends] = useState<OfflineFriend[]>([]);
  const [combinedFriends, setCombinedFriends] = useState<CombinedFriend[]>([]);
  const [globalUsers, setGlobalUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<CombinedFriend | null>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'proposals' | 'leaderboard' | 'history'>('friends');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchProfile(),
        fetchFriends(),
        fetchOfflineFriends(),
        fetchGlobalUsers()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Combine online and offline friends
    const combined: CombinedFriend[] = [
      ...friends.map(f => ({
        id: f.friend_id,
        name: f.friend.username,
        aura: f.friend.aura,
        avatar: f.friend.avatar,
        is_offline: false,
        created_at: f.created_at
      })),
      ...offlineFriends.map(f => ({
        id: f.id,
        name: f.name,
        aura: f.aura,
        avatar: f.avatar,
        is_offline: true,
        created_at: f.created_at
      }))
    ];
    
    // Sort by aura (highest first)
    combined.sort((a, b) => b.aura - a.aura);
    
    setCombinedFriends(combined);
  }, [friends, offlineFriends]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  };

  const fetchGlobalUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('aura', { ascending: false })
        .limit(100);

      if (error) throw error;
      setGlobalUsers(data || []);
    } catch (error) {
      console.error('Error fetching global users:', error);
      throw error;
    }
  };

  const fetchFriends = async () => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          *,
          friend:profiles!friends_friend_id_fkey(*)
        `)
        .eq('user_id', user?.id);

      if (error) throw error;
      setFriends(data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
      throw error;
    }
  };

  const fetchOfflineFriends = async () => {
    try {
      const { data, error } = await supabase
        .from('offline_friends')
        .select('*')
        .eq('creator_id', user?.id);

      if (error) throw error;
      setOfflineFriends(data || []);
    } catch (error) {
      console.error('Error fetching offline friends:', error);
      throw error;
    }
  };

  const deleteOfflineFriend = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('offline_friends')
        .delete()
        .eq('id', friendId)
        .eq('creator_id', user?.id);

      if (error) throw error;
      
      // Refresh offline friends
      fetchOfflineFriends();
    } catch (error) {
      console.error('Error deleting offline friend:', error);
      setError('Errore durante l\'eliminazione dell\'amico offline');
    }
  };

  const handleFriendAdded = () => {
    fetchFriends();
    fetchOfflineFriends();
  };

  const handleProposalClick = (friend: CombinedFriend) => {
    setSelectedFriend(friend);
    setShowProposalModal(true);
  };

  const handleProposalSubmitted = () => {
    setShowProposalModal(false);
    setActiveTab('proposals');
  };

  const handleProposalAction = () => {
    fetchFriends();
    fetchOfflineFriends();
    fetchGlobalUsers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-purple-600 border-b-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const formatAura = (aura) => {
    if (aura >= 1_000_000_000) {
      return (aura / 1_000_000_000).toFixed(1) + 'b'; // Billion
    } else if (aura >= 1_000_000) {
      return (aura / 1_000_000).toFixed(1) + 'm'; // Million
    } else if (aura >= 1_000) {
      return (aura / 1_000).toFixed(1) + 'k'; // Thousand
    }
    return aura.toString(); // For values less than 1000
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        combinedFriends={combinedFriends} 
        onFriendAdded={handleFriendAdded} 
      />

      {/* Main content */}
      <div className="md:pl-64">
        <header className="bg-white shadow">
          <div className="flex items-center justify-between px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-purple-600">Aura Tracker</h1>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Signed in as</p>
                <p className="font-medium">{profile?.username}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2 text-gray-500 rounded-full hover:bg-gray-100"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Profile Card */}
            <div className="p-6 bg-white rounded-lg shadow md:col-span-1">
              <ProfilePhotoUploader 
                currentAvatar={profile?.avatar} 
                onPhotoUpdated={fetchProfile} 
              />
              <h2 className="mt-4 mb-2 text-xl font-semibold text-center">{profile?.username}</h2>
              <div className={`flex items-center justify-center p-4 mb-4 text-4xl font-bold rounded-lg ${
                profile?.aura && profile.aura > 0 
                  ? 'bg-green-100 text-green-600'
                  : profile?.aura && profile.aura < 0
                  ? 'bg-red-100 text-red-600'
                  : 'bg-purple-100 text-purple-600'
              }`}>
                {profile?.aura && profile.aura > 0 ? '+' : ''}{formatAura(profile?.aura || 0)}
              </div>
              <p className="text-sm text-center text-gray-500">
                La tua aura rappresenta la tua presenza e carisma, votata dai tuoi amici.
              </p>
            </div>

            {/* Friends List / Proposals / Leaderboard / History */}
            <div className="p-6 bg-white rounded-lg shadow md:col-span-2">
              <div className="mb-6">
                <div className="flex border-b overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('friends')}
                    className={`py-2 px-4 font-medium whitespace-nowrap ${
                      activeTab === 'friends'
                        ? 'text-purple-600 border-b-2 border-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Users className="inline w-5 h-5 mr-2" />
                    I tuoi amici
                  </button>
                  <button
                    onClick={() => setActiveTab('proposals')}
                    className={`py-2 px-4 font-medium whitespace-nowrap ${
                      activeTab === 'proposals'
                        ? 'text-purple-600 border-b-2 border-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ListPlus className="inline w-5 h-5 mr-2" />
                    Proposte
                  </button>
                  <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`py-2 px-4 font-medium whitespace-nowrap ${
                      activeTab === 'leaderboard'
                        ? 'text-purple-600 border-b-2 border-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Award className="inline w-5 h-5 mr-2" />
                    Classifiche
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`py-2 px-4 font-medium whitespace-nowrap ${
                      activeTab === 'history'
                        ? 'text-purple-600 border-b-2 border-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <History className="inline w-5 h-5 mr-2" />
                    Storico
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 mb-4 text-sm text-red-600 bg-red-100 rounded-md">
                  {error}
                </div>
              )}

              {activeTab === 'friends' && (
                <>
                  {combinedFriends.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p className="mb-2 text-lg font-medium">Nessun amico</p>
                      <p>Aggiungi amici tramite la sidebar per iniziare a tracciare la loro aura!</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden bg-white border border-gray-200 rounded-md">
                      <ul className="divide-y divide-gray-200">
                        {combinedFriends.map((friend) => (
                          <li key={friend.id} className="p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
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
                                <div>
                                  <div className="flex items-center">
                                    <h3 className="font-medium">{friend.name}</h3>
                                    {friend.is_offline && (
                                      <span className="ml-2 px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                                        Offline
                                      </span>
                                    )}
                                  </div>
                                  
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className={`px-3 py-1 text-lg font-semibold rounded-full ${
                                  friend.aura > 0 
                                    ? 'bg-green-100 text-green-700' 
                                    : friend.aura < 0
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {friend?.aura && friend.aura > 0 ? '+' : ''}{formatAura(friend?.aura || 0)}
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleProposalClick(friend)}
                                    className="px-3 py-1 text-sm text-white bg-purple-600 rounded hover:bg-purple-700"
                                    title="Proponi modifica aura"
                                  >
                                    Proponi
                                  </button>
                                  {friend.is_offline && (
                                    <button
                                      onClick={() => deleteOfflineFriend(friend.id)}
                                      className="px-2 py-1 text-sm text-white bg-gray-500 rounded hover:bg-gray-600"
                                      title="Elimina amico offline"
                                    >
                                      X
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'proposals' && (
                <ProposalsList 
                  combinedFriends={combinedFriends}
                  onProposalAction={handleProposalAction}
                />
              )}

              {activeTab === 'leaderboard' && (
                <div className="space-y-8">
                  <Leaderboard 
                    title="Classifica Globale" 
                    users={globalUsers}
                    isGlobal={true}
                  />
                  <Leaderboard 
                    title="Classifica Amici" 
                    users={combinedFriends}
                  />
                </div>
              )}

              {activeTab === 'history' && user && (
                <AuraHistory userId={user.id} />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Aura Proposal Modal */}
      {showProposalModal && selectedFriend && (
        <AuraProposalModal
          friend={selectedFriend}
          onClose={() => setShowProposalModal(false)}
          onProposalSubmitted={handleProposalSubmitted}
        />
      )}
    </div>
  );
}