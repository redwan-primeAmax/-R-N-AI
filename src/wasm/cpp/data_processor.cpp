/**
 * @file data_processor.cpp
 * @brief High-efficiency C++ Data Processing & Aggregation Module.
 * Executes nested note tree sorting, tag frequency indexing, and recency ranking.
 *
 * @license Apache-2.0
 */

#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <sstream>

namespace DataProcessor {

struct NoteMeta {
    std::string id;
    std::string title;
    std::string workspaceId;
    std::string parentId;
    std::string tags; // Comma separated
    long long updatedAt;
    long long lastOpenedAt;
    bool isTrashed;
    bool isFavorite;
    bool isPinned;
};

struct TagCount {
    std::string tag;
    int count;
};

class Processor {
public:
    Processor() = default;

    /**
     * Sorts notes by Pinned -> Recent (lastOpenedAt/updatedAt) -> Title
     */
    static std::vector<NoteMeta> sortNotes(std::vector<NoteMeta> notes) {
        std::sort(notes.begin(), notes.end(), [](const NoteMeta& a, const NoteMeta& b) {
            if (a.isPinned != b.isPinned) {
                return a.isPinned > b.isPinned; // Pinned first
            }
            long long timeA = a.lastOpenedAt > 0 ? a.lastOpenedAt : a.updatedAt;
            long long timeB = b.lastOpenedAt > 0 ? b.lastOpenedAt : b.updatedAt;
            if (timeA != timeB) {
                return timeA > timeB; // Most recent first
            }
            return a.title < b.title;
        });
        return notes;
    }

    /**
     * Returns top 3 most recently opened non-trashed notes
     */
    static std::vector<NoteMeta> getTop3RecentNotes(const std::vector<NoteMeta>& notes) {
        std::vector<NoteMeta> activeNotes;
        for (const auto& n : notes) {
            if (!n.isTrashed) {
                activeNotes.push_back(n);
            }
        }

        std::sort(activeNotes.begin(), activeNotes.end(), [](const NoteMeta& a, const NoteMeta& b) {
            long long timeA = a.lastOpenedAt > 0 ? a.lastOpenedAt : a.updatedAt;
            long long timeB = b.lastOpenedAt > 0 ? b.lastOpenedAt : b.updatedAt;
            return timeA > timeB;
        });

        if (activeNotes.size() > 3) {
            activeNotes.resize(3);
        }
        return activeNotes;
    }

    /**
     * Aggregates tag frequencies across all active notes
     */
    static std::vector<TagCount> calculateTagFrequencies(const std::vector<NoteMeta>& notes) {
        std::unordered_map<std::string, int> freqMap;

        for (const auto& note : notes) {
            if (note.isTrashed || note.tags.empty()) continue;

            std::stringstream ss(note.tags);
            std::string item;
            while (std::getline(ss, item, ',')) {
                // Trim whitespace
                size_t start = item.find_first_not_of(" \t");
                size_t end = item.find_last_not_of(" \t");
                if (start != std::string::npos && end != std::string::npos) {
                    std::string cleanTag = item.substr(start, end - start + 1);
                    if (!cleanTag.empty()) {
                        freqMap[cleanTag]++;
                    }
                }
            }
        }

        std::vector<TagCount> result;
        for (const auto& kv : freqMap) {
            result.push_back({kv.first, kv.second});
        }

        std::sort(result.begin(), result.end(), [](const TagCount& a, const TagCount& b) {
            if (a.count != b.count) return a.count > b.count;
            return a.tag < b.tag;
        });

        return result;
    }

    /**
     * Filters notes belonging to a specific workspace and parent folder hierarchy
     */
    static std::vector<NoteMeta> filterNotesByFolder(
        const std::vector<NoteMeta>& notes, 
        const std::string& workspaceId, 
        const std::string& parentId
    ) {
        std::vector<NoteMeta> filtered;
        for (const auto& n : notes) {
            if (n.isTrashed) continue;
            if (!workspaceId.empty() && n.workspaceId != workspaceId) continue;
            if (n.parentId == parentId) {
                filtered.push_back(n);
            }
        }
        return sortNotes(filtered);
    }
};

} // namespace DataProcessor
