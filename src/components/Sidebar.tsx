import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, UserPlus, Menu, X, UserCog, Bell } from "lucide-react";
import { CombinedFriend, FriendRequest } from "../types";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import FriendInviteModal from "./FriendInviteModal";
import AddOfflineFriendModal from "./AddOfflineFriendModal";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  combinedFriends: CombinedFriend[];
  onFriendAdded: () => void;
}

export default function Sidebar({
  combinedFriends,
  onFriendAdded,
}: SidebarProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddOfflineModal, setShowAddOfflineModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Top friend is the one with highest aura
  const topFriend = combinedFriends.length > 0 ? combinedFriends[0] : null;

  useEffect(() => {
    fetchPendingRequests();

    // Set up real-time subscription for friend requests
    const channel = supabase
      .channel("friend_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter: `recipient_id=eq.${user?.id}`,
        },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchPendingRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("friend_requests")
        .select(
          `
          *,
          sender:profiles!friend_requests_sender_id_fkey(*)
        `
        )
        .eq("recipient_id", user.id)
        .eq("status", "pending");

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (err) {
      console.error("Error fetching pending requests:", err);
    }
  };

  const handleFriendAdded = () => {
    setShowInviteModal(false);
    setShowAddOfflineModal(false);
    onFriendAdded();
    fetchPendingRequests();
  };

  const formatAura = (aura) => {
    if (aura >= 1_000_000_000) {
      return (aura / 1_000_000_000).toFixed(1) + "b"; // Billion
    } else if (aura >= 1_000_000) {
      return (aura / 1_000_000).toFixed(1) + "m"; // Million
    } else if (aura >= 1_000) {
      return (aura / 1_000).toFixed(1) + "k"; // Thousand
    } else if (aura <= -1_000_000_000) {
      return (aura / 1_000_000_000).toFixed(1) + "b"; // Billion
    } else if (aura <= -1_000_000) {
      return (aura / 1_000_000).toFixed(1) + "m"; // Million
    } else if (aura <= -1_000) {
      return (aura / 1_000).toFixed(1) + "k"; // Thousand
    }
    return aura.toString(); // For values less than 1000
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-40 md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-gray-500 bg-white rounded-md shadow-md hover:text-purple-600 focus:outline-none"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold text-purple-600">I tuoi amici</h2>
          </div>

          {/* Friend Requests Alert */}
          {pendingRequests.length > 0 && (
            <div className="p-4 bg-purple-50 border-b">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center">
                  <Bell className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="text-purple-700 font-medium">
                    {pendingRequests.length}{" "}
                    {pendingRequests.length === 1 ? "richiesta" : "richieste"}{" "}
                    di amicizia
                  </span>
                </div>
                <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {pendingRequests.length}
                </span>
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {combinedFriends.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>Non hai ancora amici.</p>
                <p className="mt-2 text-sm">Invita qualcuno per iniziare!</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {combinedFriends.map((friend) => (
                  <li key={friend.id} className="p-3 hover:bg-gray-50">
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {friend.name}
                          </p>
                          {topFriend && friend.id === topFriend.id && (
                            <Crown className="w-4 h-4 ml-1 text-yellow-500" />
                          )}
                          {friend.is_offline && (
                            <span
                              className="ml-1 w-2 h-2 bg-gray-300 rounded-full"
                              title="Amico offline"
                            ></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          Aura: {friend?.aura && friend.aura > 0 ? "+" : ""}
                          {formatAura(friend?.aura || 0)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="relative flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Invita
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowAddOfflineModal(true)}
                className="flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                <UserCog className="w-4 h-4 mr-1" />
                Offline
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Friend invite modal */}
      {showInviteModal && (
        <FriendInviteModal
          onClose={() => setShowInviteModal(false)}
          onInviteSent={handleFriendAdded}
        />
      )}

      {/* Add offline friend modal */}
      {showAddOfflineModal && (
        <AddOfflineFriendModal
          onClose={() => setShowAddOfflineModal(false)}
          onFriendAdded={handleFriendAdded}
        />
      )}
    </>
  );
}
