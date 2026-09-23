/**
 * @file bindings.cpp
 * @brief Emscripten Embind Glue Code exposing C++ data structures and high-performance algorithms
 * directly to JavaScript / WebAssembly module runtime.
 *
 * @license Apache-2.0
 */

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include "rst_search_engine.cpp"
#include "crypto_vault.cpp"
#include "data_processor.cpp"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(notion_clone_wasm) {
    // 1. RST Search Structs & Engine
    value_object<RST::NoteItem>("NoteItem")
        .field("id", &RST::NoteItem::id)
        .field("title", &RST::NoteItem::title)
        .field("content", &RST::NoteItem::content)
        .field("tags", &RST::NoteItem::tags)
        .field("updatedAt", &RST::NoteItem::updatedAt)
        .field("isTrashed", &RST::NoteItem::isTrashed)
        .field("isLocked", &RST::NoteItem::isLocked);

    value_object<RST::SearchResult>("SearchResult")
        .field("id", &RST::SearchResult::id)
        .field("title", &RST::SearchResult::title)
        .field("score", &RST::SearchResult::score)
        .field("matchType", &RST::SearchResult::matchType);

    register_vector<RST::NoteItem>("VectorNoteItem");
    register_vector<RST::SearchResult>("VectorSearchResult");

    class_<RST::SearchEngine>("SearchEngine")
        .constructor<>()
        .class_function("calculateFuzzyScore", &RST::SearchEngine::calculateFuzzyScore)
        .class_function("calculateBM25", &RST::SearchEngine::calculateBM25)
        .class_function("getPhoneticKey", &RST::SearchEngine::getPhoneticKey)
        .function("searchNotes", &RST::SearchEngine::searchNotes);

    // 2. Crypto Vault Engine
    class_<CryptoVault::VaultEngine>("VaultEngine")
        .constructor<>()
        .class_function("hashPassword", &CryptoVault::VaultEngine::hashPassword)
        .class_function("generateSalt", &CryptoVault::VaultEngine::generateSalt)
        .class_function("encryptPayload", &CryptoVault::VaultEngine::encryptPayload)
        .class_function("decryptPayload", &CryptoVault::VaultEngine::decryptPayload)
        .class_function("verifyPassword", &CryptoVault::VaultEngine::verifyPassword);

    // 3. Data Processor Structs & Module
    value_object<DataProcessor::NoteMeta>("NoteMeta")
        .field("id", &DataProcessor::NoteMeta::id)
        .field("title", &DataProcessor::NoteMeta::title)
        .field("workspaceId", &DataProcessor::NoteMeta::workspaceId)
        .field("parentId", &DataProcessor::NoteMeta::parentId)
        .field("tags", &DataProcessor::NoteMeta::tags)
        .field("updatedAt", &DataProcessor::NoteMeta::updatedAt)
        .field("lastOpenedAt", &DataProcessor::NoteMeta::lastOpenedAt)
        .field("isTrashed", &DataProcessor::NoteMeta::isTrashed)
        .field("isFavorite", &DataProcessor::NoteMeta::isFavorite)
        .field("isPinned", &DataProcessor::NoteMeta::isPinned);

    value_object<DataProcessor::TagCount>("TagCount")
        .field("tag", &DataProcessor::TagCount::tag)
        .field("count", &DataProcessor::TagCount::count);

    register_vector<DataProcessor::NoteMeta>("VectorNoteMeta");
    register_vector<DataProcessor::TagCount>("VectorTagCount");

    class_<DataProcessor::Processor>("Processor")
        .constructor<>()
        .class_function("sortNotes", &DataProcessor::Processor::sortNotes)
        .class_function("getTop3RecentNotes", &DataProcessor::Processor::getTop3RecentNotes)
        .class_function("calculateTagFrequencies", &DataProcessor::Processor::calculateTagFrequencies)
        .class_function("filterNotesByFolder", &DataProcessor::Processor::filterNotesByFolder);
}
