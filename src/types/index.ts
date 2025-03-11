export interface User {
  id: string;
  email: string;
  username: string;
  aura: number;
  created_at: string;
  avatar?: string;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend: User;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: User;
  recipient?: User;
}

export interface OfflineFriend {
  id: string;
  creator_id: string;
  name: string;
  email?: string;
  aura: number;
  avatar?: string;
  is_offline: boolean;
  created_at: string;
}

export interface CombinedFriend {
  id: string;
  name: string;
  email?: string;
  aura: number;
  avatar?: string;
  is_offline: boolean;
  created_at: string;
}

export interface Vote {
  id: string;
  voter_id: string;
  recipient_id: string;
  value: number;
  created_at: string;
}

export interface FriendInvite {
  id: string;
  sender_id: string;
  recipient_email: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface AuraProposal {
  id: string;
  proposer_id: string;
  recipient_id: string;
  is_recipient_offline: boolean;
  value: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  proposer?: User;
  recipient_name?: string;
  recipient_avatar?: string;
  total_votes?: number;
  approve_votes?: number;
}

export interface ProposalVote {
  id: string;
  proposal_id: string;
  voter_id: string;
  vote: boolean;
  created_at: string;
  voter?: User;
}