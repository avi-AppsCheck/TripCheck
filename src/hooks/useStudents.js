import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export function useStudents(groupId) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "groups", groupId, "students"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by name by default
      docs.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      setStudents(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, [groupId]);

  return { students, loading };
}
