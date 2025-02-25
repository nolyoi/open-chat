# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [unreleased]

### Changed

- Use dynamic buffer size when reading from stable memory ([#4683](https://github.com/open-chat-labs/open-chat/pull/4683))
- Avoid reseeding random number generator after each upgrade ([#4755](https://github.com/open-chat-labs/open-chat/pull/4755))
- Update dependencies ([#4770](https://github.com/open-chat-labs/open-chat/pull/4770))
- Regenerate random number generator seed across upgrades ([#4814](https://github.com/open-chat-labs/open-chat/pull/4814))

## [[2.0.757](https://github.com/open-chat-labs/open-chat/releases/tag/v2.0.757-storage_bucket)] - 2023-07-20

### Changed

- Avoid using `candid::Func` type directly ([#3983](https://github.com/open-chat-labs/open-chat/pull/3983))

## [[2.0.717](https://github.com/open-chat-labs/open-chat/releases/tag/v2.0.717-storage_bucket)] - 2023-06-12

### Changed

- Get `freezing_limit` from system in `check_cycles_balance` ([#3767](https://github.com/open-chat-labs/open-chat/pull/3767))

## [[2.0.708](https://github.com/open-chat-labs/open-chat/releases/tag/v2.0.708-storage_bucket)] - 2023-06-01

### Added

- Add `git_commit_id` to metrics ([#3691](https://github.com/open-chat-labs/open-chat/pull/3691))

### Removed

- Removed code only needed for previous upgrade ([#3248](https://github.com/open-chat-labs/open-chat/pull/3248))

## [[2.0.613](https://github.com/open-chat-labs/open-chat/releases/tag/v2.0.613-storage_bucket)] - 2023-02-24

### Changed

- Merge OpenStorage into the OpenChat repo ([#3185](https://github.com/open-chat-labs/open-chat/pull/3185))
