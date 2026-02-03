import Fuse, { FuseResultMatch } from 'fuse.js';
import { HarmonizedSystemCode } from './types';
import fuseIndex_data from './data/fuse_index.json'; // Import the Fuse index directly

// Use fuseIndex directly as a JavaScript object
async function loadFuseIndex(): Promise<Fuse<HarmonizedSystemCode>> {
    return new Fuse<HarmonizedSystemCode>(fuseIndex_data._docs, fuseIndex_data.options);
}

// Function to search using the Fuse.js index and highlight matches
// Function to search using the Fuse.js index and highlight matches
export async function searchHsCodes(query: string): Promise<{ item: HarmonizedSystemCode; matches: FuseResultMatch[] }[]> {

    const fuseIndex = await loadFuseIndex();

    // Explicitly type the results array
    const results: { item: HarmonizedSystemCode; matches: FuseResultMatch[] }[] = [];

    // we want to remove any . if its a full digit string
    // e.g. 121211.90 => 12121190, 12.11.90 => 121190
    if (query.match(/^\d+(\.\d+)*$/)) {
        query = query.replace(/\./g, '');
    }

    // Perform the search with matching highlights enabled
    const search_results = fuseIndex.search(query);
    results.push(...search_results.map(result => ({
        item: result.item,
        matches: Array.from(result.matches || [])
    })));


    console.log(`Found ${results.length} HS codes for query: ${query}`);

    // Return the matching items along with the matches for highlighting
    return results
}

// Utility to highlight the matched words in a text
export async function highlightText(text: string, matches: FuseResultMatch[]): Promise<string> {
    if (!matches.length) return text;

    let highlightedText = text;

    // Loop through each match and wrap it in <mark> tag for highlighting
    matches.reverse().forEach(match => {
        match.indices.forEach(([start, end]) => {
            const matchedStr = text.slice(start, end + 1);
            highlightedText = highlightedText.replace(matchedStr, `<mark>${matchedStr}</mark>`);
        });
    });

    return highlightedText;
}