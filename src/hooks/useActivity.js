import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useActivity(activityId) {
  const { currentUser } = useAuth();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId || !currentUser) {
      setActivity(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "activities", activityId), (docSnap) => {
      if (docSnap.exists() && docSnap.data().createdBy === currentUser.uid) {
        setActivity({ id: docSnap.id, ...docSnap.data() });
      } else {
        setActivity(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [activityId, currentUser]);

  return { activity, loading };
}
