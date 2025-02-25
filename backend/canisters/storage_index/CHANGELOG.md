# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [unreleased]

### Changed

- Use dynamic buffer size when reading from stable memory ([#4683](https://github.com/open-chat-labs/open-chat/pull/4683))
- Avoid reseeding random number generator after each upgrade ([#4755](https://github.com/open-chat-labs/open-chat/pull/4755))
- Update dependencies ([#4770](https://github.com/open-chat-labs/open-chat/pull/4770))
- Regenerate random number generator seed across upgrades ([#4814](https://github.com/open-chat-labs/open-chat/pull/4814))

## [[2.0.795](https://github.com/open-chat-labs/open-chat/releases/tag/v2.0.795-storage_index)] - 2023-08-08

### Changed

- Bump number of cycles required for upgrade ([#4155](https://github.com/open-chat-labs/open-chat/pull/4155))

## [[2.0.720](https://github.com/open-chat-labs/open-chat/releases/tag/v2.0.720-storage_index)] - 2023-06-14

### Fixed

- Another fix for topping up StorageBucket canisters ([#3789](https://github.com/open-chat-labs/open-chat/pull/3789))

## [[2.0.718](https://github.com/open-chat-labs/open-chat/releases/tag/v2.0.718-storage_index)] - 2023-06-14

### Fixed

- Fix cycles top-ups of storage bucket canisters ([#3782](https://github.com/open-chat-labs/open-chat/pull/3782))

## [[2.0.707](https://github.com/open-chat-labs/open-chat/releases/tag/v2.0.707-storage_index)] - 2023-06-01

### Added

- Added missing proposal validation functions ([#3298](https://github.com/open-chat-labs/open-chat/pull/3298))
- Add `git_commit_id` to metrics ([#3691](https://github.com/open-chat-labs/open-chat/pull/3691))

### Removed

- Removed code only needed for previous upgrade ([#3248](https://github.com/open-chat-labs/open-chat/pull/3248))
- Removed `set_governance_principals` ([#3301](https://github.com/open-chat-labs/open-chat/pull/3301))

### Fixed

- Fixed guard on `add_bucket_canister` ([#3243](https://github.com/open-chat-labs/open-chat/pull/3243))

## [[2.0.612](https://github.com/open-chat-labs/open-chat/releases/tag/v2.0.612-storage_index)] - 2023-02-24

### Added

- Add `user_controllers` to metrics ([#3212](https://github.com/open-chat-labs/open-chat/pull/3212))

### Changed

- Merge OpenStorage into the OpenChat repo ([#3185](https://github.com/open-chat-labs/open-chat/pull/3185))
- Separate `user_controllers` from `governance_principals` ([#3187](https://github.com/open-chat-labs/open-chat/pull/3187))