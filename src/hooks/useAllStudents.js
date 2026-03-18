import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useAllStudents(groups) {
  const { currentUser } = useAuth();
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function fetchStudents() {
      setLoading(true); // Ensure loading is true initially while fetching
      if (!currentUser || !groups || groups.length === 0) {
        if (!isCancelled) {
            setAllStudents([]);
            setLoading(false);
        }
        return;
      }
      
      const promises = groups.map(async (group) => {
        const studentDocs = await getDocs(collection(db, "groups", group.id, "students"));
        const groupStudents = [];
        studentDocs.forEach(doc => {
          groupStudents.push({
            id: doc.id,
            name: doc.data().name || '',
            groupId: group.id,
            groupName: group.name
          });
        });
        return groupStudents;
      });

      const results = await Promise.all(promises);
      let students = results.flat();
      
      if (!isCancelled) {
          setAllStudents(students);
          setLoading(false);
      }
    }
    fetchStudents();

    return () => {
        isCancelled = true;
    };
  }, [currentUser, groups]);

  return { allStudents, loading };
}
