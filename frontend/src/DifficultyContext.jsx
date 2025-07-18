import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUserInfo } from './UserIdContext';
import { authenticatedApiCall } from './services/api';
import { getApiBase } from './config';

const DifficultyContext = createContext();

export const useDifficulty = () => {
  const context = useContext(DifficultyContext);
  if (!context) {
    throw new Error('useDifficulty must be used within a DifficultyProvider');
  }
  return context;
};

export const DifficultyProvider = ({ children }) => {
  const { userId } = useUserInfo();
  const [difficulty, setDifficulty] = useState('easy');
  const [loading, setLoading] = useState(true);

  // Fetch difficulty from preferences
  useEffect(() => {
    const fetchDifficulty = async () => {
      if (!userId) {
        setDifficulty('easy');
        setLoading(false);
        return;
      }
      
      try {
        const res = await authenticatedApiCall(`${getApiBase()}/api/ndf/preferences?user_id=${encodeURIComponent(userId)}`);
        const data = await res.json();
        setDifficulty(data.difficulty || 'easy');
      } catch (error) {
        console.error('Failed to fetch difficulty:', error);
        setDifficulty('easy');
      } finally {
        setLoading(false);
      }
    };

    fetchDifficulty();
  }, [userId]);

  // Difficulty-based restrictions
  const restrictions = {
    // Easy level restrictions
    easy: {
      canActivateTransitions: false,
      canChooseRoles: false,
      canUseAdjectives: false,
      canUseAdverbs: false,
      canUseQuantifiers: false,
      canUseModality: false,
      canUseParseButton: false,
      canUseAdvancedParse: false,
      canUseMorphManagement: false,
      canCreateTransitions: false,
      canEditCNL: false,
      canUseProcessRole: false,
      canUseFunctionRole: false,
      canUseDerivedFunctions: false,
      canUseSentenceConnectives: false,
      canUseDerivedAttributes: false,
      canValidateAllLevels: false,
      canModerateAllMessages: false,
      defaultRole: 'individual'
    },
    
    // Moderate level restrictions
    moderate: {
      canActivateTransitions: false,
      canChooseRoles: true,
      canUseAdjectives: true,
      canUseAdverbs: false,
      canUseQuantifiers: false,
      canUseModality: false,
      canUseParseButton: true,
      canUseAdvancedParse: false,
      canUseMorphManagement: false,
      canCreateTransitions: false,
      canEditCNL: false,
      canUseProcessRole: false,
      canUseFunctionRole: false,
      canUseDerivedFunctions: false,
      canUseSentenceConnectives: false,
      canUseDerivedAttributes: false,
      canValidateAllLevels: false,
      canModerateAllMessages: true,
      defaultRole: 'individual'
    },
    
    // Advanced level restrictions
    advanced: {
      canActivateTransitions: false,
      canChooseRoles: true,
      canUseAdjectives: true,
      canUseAdverbs: true,
      canUseQuantifiers: true,
      canUseModality: false,
      canUseParseButton: true,
      canUseAdvancedParse: true,
      canUseMorphManagement: true,
      canCreateTransitions: true,
      canEditCNL: true,
      canUseProcessRole: true,
      canUseFunctionRole: false,
      canUseDerivedFunctions: false,
      canUseSentenceConnectives: false,
      canUseDerivedAttributes: false,
      canValidateAllLevels: false,
      canModerateAllMessages: true,
      defaultRole: 'individual'
    },
    
    // Expert level restrictions
    expert: {
      canActivateTransitions: true,
      canChooseRoles: true,
      canUseAdjectives: true,
      canUseAdverbs: true,
      canUseQuantifiers: true,
      canUseModality: true,
      canUseParseButton: true,
      canUseAdvancedParse: true,
      canUseMorphManagement: true,
      canCreateTransitions: true,
      canEditCNL: true,
      canUseProcessRole: true,
      canUseFunctionRole: true,
      canUseDerivedFunctions: true,
      canUseSentenceConnectives: true,
      canUseDerivedAttributes: true,
      canValidateAllLevels: false,
      canModerateAllMessages: true,
      defaultRole: 'individual'
    },
    
    // Super User level restrictions (for future use)
    superuser: {
      canActivateTransitions: true,
      canChooseRoles: true,
      canUseAdjectives: true,
      canUseAdverbs: true,
      canUseQuantifiers: true,
      canUseModality: true,
      canUseParseButton: true,
      canUseAdvancedParse: true,
      canUseMorphManagement: true,
      canCreateTransitions: true,
      canEditCNL: true,
      canUseProcessRole: true,
      canUseFunctionRole: true,
      canUseDerivedFunctions: true,
      canUseSentenceConnectives: true,
      canUseDerivedAttributes: true,
      canValidateAllLevels: true,
      canModerateAllMessages: true,
      defaultRole: 'individual'
    }
  };

  const currentRestrictions = restrictions[difficulty] || restrictions.easy;

  const value = {
    difficulty,
    setDifficulty,
    loading,
    restrictions: currentRestrictions,
    isFeatureEnabled: (feature) => currentRestrictions[feature] || false
  };

  return (
    <DifficultyContext.Provider value={value}>
      {children}
    </DifficultyContext.Provider>
  );
}; 