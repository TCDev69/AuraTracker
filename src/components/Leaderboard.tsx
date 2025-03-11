import React from 'react';
import { Trophy } from 'lucide-react';
import { User, CombinedFriend } from '../types';

interface LeaderboardProps {
  title: string;
  users: (User | CombinedFriend)[];
  isGlobal?: boolean;
}

export default function Leaderboard({ title, users, isGlobal = false }: LeaderboardProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
          {title}
        </h2>
      </div>
      <div className="divide-y divide-gray-200">
        {users.map((user, index) => (
          <div key={'username' in user ? user.username : user.name} className="p-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 text-center font-semibold text-gray-500">
                #{index + 1}
              </div>
              <div className="flex-shrink-0">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={'username' in user ? user.username : user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center">
                    <span className="text-purple-700 font-medium">
                      {('username' in user ? user.username : user.name).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium">{'username' in user ? user.username : user.name}</p>
                {'is_offline' in user && user.is_offline && (
                  <span className="text-xs text-gray-500">(Offline)</span>
                )}
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full font-semibold ${
              user.aura > 0 
                ? 'bg-green-100 text-green-700' 
                : user.aura < 0 
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {user.aura > 0 ? '+' : ''}{user.aura}
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-lg font-medium mb-1">Nessun dato disponibile</p>
            <p className="text-sm">
              {isGlobal 
                ? 'Non ci sono ancora utenti nella classifica globale.'
                : 'Aggiungi amici per vedere la classifica privata!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}