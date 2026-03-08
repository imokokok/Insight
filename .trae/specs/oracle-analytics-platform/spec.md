# Oracle Analytics Platform - Product Requirement Document

## Overview

- **Summary**: A web-based oracle data analytics platform that integrates 5 major oracle networks (Chainlink, Band Protocol, UMA, Pyth Network, API3), providing price comparison features and individual oracle analytics pages.
- **Purpose**: To enable users to easily compare oracle prices across different chains and networks, and analyze each oracle's unique characteristics in a professional, user-friendly interface.
- **Target Users**: DeFi developers, researchers, traders, and crypto enthusiasts who need reliable oracle data analysis.

## Goals

- Integrate 5 major oracle networks: Chainlink, Band Protocol, UMA, Pyth Network, API3
- Provide cross-oracle price comparison on the same blockchain
- Provide cross-chain price comparison for the same oracle
- Create dedicated analytics pages for each oracle
- Build a professional, clean, and intuitive data analytics UI
- Deploy on Vercel with Supabase backend

## Non-Goals (Out of Scope)

- Advanced trading features or execution
- Complex statistical modeling beyond basic analytics
- Real-time alerting/notifications system
- Custom oracle integration by end-users
- Mobile native application

## Background & Context

- Oracle networks are critical infrastructure for DeFi, providing reliable off-chain data
- Different oracles have different strengths, data sources, and pricing mechanisms
- Current market lacks a simple, unified platform for comparing oracle data across networks
- Vercel + Supabase provides a modern, scalable stack for rapid development

## Functional Requirements

- **FR-1**: Oracle Price Comparison - Compare prices from different oracles on the same blockchain
- **FR-2**: Cross-Chain Price Comparison - Compare prices from the same oracle across different blockchains
- **FR-3**: Oracle-Specific Analytics Pages - Dedicated pages for each of the 5 oracles showing their unique characteristics
- **FR-4**: Data Visualization - Charts and graphs displaying price trends and comparisons
- **FR-5**: Responsive UI - Professional, clean interface that works on desktop and mobile

## Non-Functional Requirements

- **NFR-1**: Performance - Page loads in < 2 seconds, data updates within reasonable time
- **NFR-2**: Reliability - Minimal downtime, graceful error handling for failed API calls
- **NFR-3**: Maintainability - Feature-based architecture, clean code structure
- **NFR-4**: Accessibility - WCAG 2.0 AA compliant UI

## Constraints

- **Technical**: Next.js (React), TypeScript, Tailwind CSS, Vercel, Supabase, Recharts (for visualization)
- **Business**: Project must be simple, no overcomplicated features; focus on core analytics
- **Dependencies**: External oracle APIs, CoinGecko/CoinMarketCap for price data, Etherscan/Polygonscan for blockchain data

## Assumptions

- All 5 oracles have public APIs or data feeds accessible
- Basic blockchain data is available via public explorers
- Users have basic understanding of DeFi and oracle concepts
- Vercel and Supabase free tiers are sufficient for initial deployment

## Acceptance Criteria

### AC-1: Cross-Oracle Price Comparison

- **Given**: User is on the price comparison page
- **When**: User selects a blockchain and multiple oracles
- **Then**: System displays real-time (or recent) price data from selected oracles side by side
- **Verification**: `programmatic`

### AC-2: Cross-Chain Same-Oracle Price Comparison

- **Given**: User is on the cross-chain comparison page
- **When**: User selects an oracle and multiple blockchains
- **Then**: System displays price data from the selected oracle across chosen blockchains
- **Verification**: `programmatic`

### AC-3: Oracle-Specific Analytics Page Exists for All 5 Oracles

- **Given**: User navigates to the platform
- **When**: User looks for oracle-specific pages
- **Then**: Pages exist for Chainlink, Band Protocol, UMA, Pyth Network, and API3, each showing unique characteristics
- **Verification**: `human-judgment`

### AC-4: Data Visualization Charts Display Correctly

- **Given**: User is on a page with price data
- **When**: Price data is loaded
- **Then**: Charts display price trends in a readable, professional format
- **Verification**: `human-judgment`

### AC-5: Responsive UI Works on Multiple Devices

- **Given**: User accesses the platform from different devices
- **When**: Using desktop, tablet, or mobile
- **Then**: UI adapts correctly and remains usable
- **Verification**: `human-judgment`

### AC-6: Feature-Based Architecture Implemented

- **Given**: Codebase is examined
- **When**: Looking at project structure
- **Then**: Features are organized in separate directories with clear separation of concerns
- **Verification**: `programmatic`

### AC-7: Vercel + Supabase Integration Works

- **Given**: Application is deployed
- **When**: Using the platform
- **Then**: Frontend is served via Vercel, and backend data is stored/retrieved from Supabase
- **Verification**: `programmatic`

## Open Questions

- [ ] Which specific blockchains should we support initially? (Ethereum mainnet, Polygon, Arbitrum, Optimism recommended)
- [ ] What price pairs should we prioritize? (ETH/USD, BTC/USD recommended)
- [ ] How frequently should data be updated?
