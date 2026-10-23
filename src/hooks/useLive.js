import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";

/**
 * Realtime Firestore collection listener with offline cache support.
 * `queryRef` must be memoised by the caller.
 */
export function useLiveQuery(queryRef) {
  const [state, setState] = useState({
    data: [],
    loading: Boolean(queryRef),
    error: null,
    fromCache: false,
  });

  useEffect(() => {
    if (!queryRef) {
      setState({ data: [], loading: false, error: null, fromCache: false });
      return undefined;
    }

    let active = true;
    setState((prev) => ({
      ...prev,
      loading: prev.data.length === 0,
      error: null,
    }));

    const unsubscribe = onSnapshot(
      queryRef,
      (snapshot) => {
        if (!active) return;
        setState({
          data: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
          loading: false,
          error: null,
          fromCache: snapshot.metadata.fromCache,
        });
      },
      (error) => {
        if (!active) return;
        setState((prev) => ({ ...prev, loading: false, error }));
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryRef]);

  return state;
}

/** Realtime Firestore document listener. `docRef` must be memoised. */
export function useLiveDoc(docRef) {
  const [state, setState] = useState({
    data: null,
    loading: Boolean(docRef),
    error: null,
    fromCache: false,
  });

  useEffect(() => {
    if (!docRef) {
      setState({ data: null, loading: false, error: null, fromCache: false });
      return undefined;
    }

    let active = true;
    setState((prev) => ({ ...prev, loading: !prev.data, error: null }));

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!active) return;
        setState({
          data: snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null,
          loading: false,
          error: null,
          fromCache: snapshot.metadata.fromCache,
        });
      },
      (error) => {
        if (!active) return;
        setState((prev) => ({ ...prev, loading: false, error }));
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [docRef]);

  return state;
}
