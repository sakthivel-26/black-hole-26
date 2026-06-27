const query = "Annul Maelae Harris Jayaraj";

async function testLrcLibSearch() {
  const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
  console.log('Searching LrcLib:', url);
  try {
    const res = await fetch(url);
    console.log('LrcLib Search Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('Results count:', data.length);
      if (data.length > 0) {
        data.slice(0, 5).forEach((item, index) => {
          console.log(`[${index}] Match:`, {
            trackName: item.trackName,
            artistName: item.artistName,
            albumName: item.albumName,
            hasSynced: !!item.syncedLyrics,
            hasPlain: !!item.plainLyrics
          });
        });
      }
    } else {
      console.log('LrcLib Search Error:', await res.text());
    }
  } catch (err) {
    console.error('LrcLib Search Error:', err);
  }
}

testLrcLibSearch();
