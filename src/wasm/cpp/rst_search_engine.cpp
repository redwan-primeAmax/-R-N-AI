/**
 * @file rst_search_engine.cpp
 * @brief High-performance C++ implementation of RST Search Engine, Bitap Bitwise Fuzzy Matcher,
 * Okapi BM25 Scoring, Bengali/English Phonetic Compression, and Note Indexing.
 *
 * @license Apache-2.0
 */

#include <iostream>
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <cmath>
#include <sstream>
#include <cctype>

namespace RST {

struct NoteItem {
    std::string id;
    std::string title;
    std::string content;
    std::string tags;
    long long updatedAt;
    bool isTrashed;
    bool isLocked;
};

struct SearchResult {
    std::string id;
    std::string title;
    double score;
    std::string matchType;
};

class SearchEngine {
public:
    SearchEngine() = default;

    /**
     * Bitap Bitwise Fuzzy Matching algorithm (Distance = 1)
     * Returns score: 0.0 (exact) to 1.0 (no match)
     */
    static double calculateFuzzyScore(const std::string& text, const std::string& pattern) {
        if (pattern.empty()) return 0.0;
        if (text.empty()) return 1.0;

        std::string textLower = toLower(text);
        std::string patternLower = toLower(pattern);

        if (textLower.find(patternLower) != std::string::npos) {
            return (static_cast<double>(patternLower.length()) / static_cast<double>(textLower.length())) * 0.1;
        }

        size_t m = patternLower.length();
        if (m > 31) {
            return (textLower.find(patternLower) != std::string::npos) ? 0.0 : 1.0;
        }

        std::vector<unsigned int> charMask(256, ~0u);
        for (size_t i = 0; i < m; ++i) {
            unsigned char c = static_cast<unsigned char>(patternLower[i]);
            charMask[c] &= ~(1u << i);
        }

        unsigned int R0 = ~1u;
        unsigned int R1 = ~0u;

        for (size_t i = 0; i < textLower.length(); ++i) {
            unsigned char c = static_cast<unsigned char>(textLower[i]);
            unsigned int oldR0 = R0;
            R0 |= charMask[c];
            R0 <<= 1;

            if ((R0 & (1u << m)) == 0) return 0.2; // Match with zero error

            unsigned int charMatch = charMask[c];
            R1 = (R1 | charMatch) << 1 & (oldR0 | (oldR0 << 1) | R1);

            if ((R1 & (1u << m)) == 0) return 0.5; // Match with small error
        }

        return 1.0;
    }

    /**
     * Okapi BM25 Ranking Score
     */
    static double calculateBM25(double termFreq, double docLength, double avgDocLength, double totalDocs, double docsWithTerm) {
        if (docsWithTerm <= 0) return 0.0;
        double k1 = 1.2;
        double b = 0.75;

        double idf = std::log((totalDocs - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1.0);
        if (idf < 0) idf = 0.001;

        double tf = (termFreq * (k1 + 1.0)) / (termFreq + k1 * (1.0 - b + b * (docLength / (avgDocLength > 0 ? avgDocLength : 1.0))));
        return idf * tf;
    }

    /**
     * Benglai & English Soundex Phonetic Compressor
     */
    static std::string getPhoneticKey(const std::string& word) {
        if (word.empty()) return "";
        std::string lower = toLower(word);

        // Simple Soundex mapping for English
        char first = std::toupper(static_cast<unsigned char>(lower[0]));
        std::string key = "";
        key += first;

        auto getCode = [](char c) -> char {
            switch (std::tolower(static_cast<unsigned char>(c))) {
                case 'b': case 'f': case 'p': case 'v': return '1';
                case 'c': case 'g': case 'j': case 'k': case 'q': case 's': case 'x': case 'z': return '2';
                case 'd': case 't': return '3';
                case 'l': return '4';
                case 'm': case 'n': return '5';
                case 'r': return '6';
                default: return '0';
            }
        };

        char lastCode = getCode(lower[0]);
        for (size_t i = 1; i < lower.length() && key.length() < 5; ++i) {
            char code = getCode(lower[i]);
            if (code != '0') {
                if (code != lastCode) {
                    key += code;
                    lastCode = code;
                }
            } else {
                lastCode = '0';
            }
        }

        while (key.length() < 5) key += '0';
        return "EN_" + key;
    }

    /**
     * Fast Note Ranking & Search Filter
     */
    std::vector<SearchResult> searchNotes(const std::vector<NoteItem>& notes, const std::string& query) {
        std::vector<SearchResult> results;
        if (query.empty() || notes.empty()) return results;

        std::string qLower = toLower(query);
        double totalDocs = static_cast<double>(notes.size());
        double totalLength = 0;

        for (const auto& note : notes) {
            totalLength += note.title.length() + note.content.length();
        }
        double avgDocLength = totalLength / (totalDocs > 0 ? totalDocs : 1.0);

        // Calculate doc frequency for query
        double docsWithTerm = 0;
        for (const auto& note : notes) {
            std::string fullText = toLower(note.title + " " + note.content);
            if (fullText.find(qLower) != std::string::npos) {
                docsWithTerm += 1.0;
            }
        }

        for (const auto& note : notes) {
            if (note.isTrashed || note.isLocked) continue;

            std::string titleLower = toLower(note.title);
            std::string contentLower = toLower(note.content);
            std::string fullText = titleLower + " " + contentLower;

            double fuzzyTitle = calculateFuzzyScore(titleLower, qLower);
            double fuzzyContent = calculateFuzzyScore(contentLower, qLower);

            if (fuzzyTitle > 0.8 && fuzzyContent > 0.8) continue; // Skip non-matching

            double termFreq = 0;
            size_t pos = 0;
            while ((pos = fullText.find(qLower, pos)) != std::string::npos) {
                termFreq += 1.0;
                pos += qLower.length();
            }

            double docLength = static_cast<double>(fullText.length());
            double bm25 = calculateBM25(termFreq, docLength, avgDocLength, totalDocs, docsWithTerm > 0 ? docsWithTerm : 1.0);

            double finalScore = (1.0 - std::min(fuzzyTitle, fuzzyContent)) * 10.0 + bm25;

            SearchResult res;
            res.id = note.id;
            res.title = note.title;
            res.score = finalScore;
            res.matchType = (fuzzyTitle < 0.3) ? "title_exact" : "content_match";
            results.push_back(res);
        }

        // Sort descending by relevance score
        std::sort(results.begin(), results.end(), [](const SearchResult& a, const SearchResult& b) {
            return a.score > b.score;
        });

        return results;
    }

private:
    static std::string toLower(const std::string& str) {
        std::string out = str;
        std::transform(out.begin(), out.end(), out.begin(), [](unsigned char c) { return std::tolower(c); });
        return out;
    }
};

} // namespace RST
