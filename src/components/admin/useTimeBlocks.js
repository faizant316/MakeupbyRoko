import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';

// One query for Roko's blocked time, shared by every calendar surface. Same key
// everywhere, so the Home grid, the day schedule, the appointments list and the
// Add Client panel all read one cached copy and refresh together.
const NONE = [];

export function useTimeBlocks() {
  const { data } = useQuery({
    queryKey: ['time-blocks'],
    queryFn: () => api.entities.TimeBlock.list(),
    staleTime: 30000,
  });
  return Array.isArray(data) ? data : NONE;
}
