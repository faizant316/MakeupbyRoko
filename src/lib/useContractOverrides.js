import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { CONTRACT_SETTINGS_KEY, parseContractSettings } from './contract';

// Client hook: returns Roko's editable contract overrides (from app_settings)
// to pass into buildContract. Returns {} until loaded, so the contract always
// renders with its built-in defaults meanwhile.
export function useContractOverrides() {
  const { data } = useQuery({
    queryKey: ['contract-settings'],
    queryFn: () => api.entities.AppSettings.filter({ key: CONTRACT_SETTINGS_KEY }),
    staleTime: 60000,
  });
  return parseContractSettings(data?.[0]?.value);
}
