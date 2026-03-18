import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export function useActivityHistory(activityId) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "activities", activityId, "checks"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a,b) => (b.checkedAt?.seconds || 0) - (a.checkedAt?.seconds || 0));
      setHistory(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, [activityId]);

  return { history, loading };
}
