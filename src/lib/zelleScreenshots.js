// Every Zelle screenshot on a booking or bridal inquiry, oldest first.
//
// A client can send more than one (a deposit split across two payments), so
// the list lives in `zelle_screenshots`. Uploads from before that column
// existed only have the single `zelle_screenshot` path, which reads here as a
// list of one, so callers never have to check both.
export function screenshotPaths(record) {
  if (record?.zelle_screenshots?.length) return record.zelle_screenshots;
  return record?.zelle_screenshot ? [record.zelle_screenshot] : [];
}

// The same list as short-lived signed URLs. The bucket is private, so a stored
// path is useless to a browser until it is signed. One call signs them all.
export async function signScreenshots(supabase, record, seconds = 3600) {
  const paths = screenshotPaths(record);
  if (!paths.length) return [];
  const { data, error } = await supabase.storage
    .from('zelle-screenshots')
    .createSignedUrls(paths, seconds);
  if (error) throw error;
  return (data || []).map(d => d.signedUrl).filter(Boolean);
}
