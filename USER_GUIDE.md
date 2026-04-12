# Insight Oracle Data Analytics Platform - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Home Page Features](#home-page-features)
3. [Price Query](#price-query)
4. [Cross-Oracle Comparison](#cross-oracle-comparison)
5. [Cross-Chain Analysis](#cross-chain-analysis)
6. [Oracle-Specific Pages](#oracle-specific-pages)
7. [Alerts Management](#alerts-management)
8. [Favorites](#favorites)
9. [Snapshots](#snapshots)
10. [User Settings](#user-settings)
11. [Data Export](#data-export)

---

## Getting Started

### Creating an Account

The Insight platform offers multiple registration methods for your convenience.

#### Email/Password Registration

1. Navigate to the [Registration Page](/register)
2. Enter your email address
3. Create a password (minimum 6 characters)
4. Optionally provide a display name
5. Accept the Terms of Service and Privacy Policy
6. Click the "Register" button
7. Check your email for a verification link
8. Click the verification link to activate your account

#### OAuth Registration

The platform supports OAuth authentication through:

- **Google**: Click the Google button on the registration page
- **GitHub**: Click the GitHub button on the registration page

OAuth registration automatically creates your account and links it to your social profile.

### Logging In

1. Navigate to the [Login Page](/[locale]/login)
2. Enter your registered email address
3. Enter your password
4. Optionally check "Remember me" to stay logged in
5. Click the "Login" button

**OAuth Login**: You can also log in using Google or GitHub by clicking the respective buttons.

**Password Recovery**: If you forget your password, click "Forgot Password?" to receive a password reset email.

### Navigation Overview

The platform features an intuitive navigation system:

#### Main Navigation Menu

| Menu               | Description                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| **Home**           | Dashboard with platform overview and key metrics                         |
| **Market**         | Price Query tools                                                        |
| **Data Analysis**  | Cross-Oracle and Cross-Chain analysis tools                              |
| **Oracle Details** | Individual oracle pages (Chainlink, Pyth, API3, RedStone, DIA, WINkLink) |

#### User Menu (Logged In)

- **Favorites**: Quick access to saved configurations
- **Alerts**: Price alert management
- **Settings**: User preferences and account settings
- **Sign Out**: Log out of your account

#### Language Switcher

Toggle between English and Chinese (Simplified) using the language switcher in the navigation bar.

---

## Home Page Features

The home page provides a comprehensive overview of the oracle ecosystem.

### Professional Hero Section

The hero section displays:

- **Live Status Badge**: Indicates real-time data connectivity
- **Platform Tagline**: "Insight Oracle Data - Power Smart Decisions"
- **Search Box**: Search for trading pairs, oracles, or blockchains
- **Quick Action Buttons**:
  - "Start Exploring" - Navigate to Price Query
  - "View Documentation" - Access platform documentation

### Live Price Ticker

A scrolling ticker displaying real-time prices for major oracle tokens:

- Chainlink (LINK)
- Pyth Network (PYTH)
- API3 (API3)
- RedStone (REDSTONE)
- DIA (DIA)
- WINkLink (WINKLINK)

Each ticker shows:

- Current price in USD
- 24-hour price change percentage
- Visual trend indicator (green/red)

### Bento Metrics Grid

A visual dashboard displaying key platform statistics:

| Metric               | Description                                      |
| -------------------- | ------------------------------------------------ |
| **Total TVS**        | Total Value Secured across all oracles (~$42.1B) |
| **Active Oracles**   | Number of supported oracle protocols (5)         |
| **Supported Pairs**  | Total trading pairs available (1200+)            |
| **Blockchains**      | Number of supported blockchain networks          |
| **Protocols**        | Number of integrated DeFi protocols              |
| **Market Dominance** | Top oracle market share percentage               |

Each metric card includes:

- Mini trend chart showing historical data
- Percentage change indicator
- Interactive hover effects

### Arbitrage Heatmap

A visual heatmap displaying price discrepancies across:

- Different oracles
- Multiple blockchains
- Various trading pairs

Color coding indicates:

- **Green**: Lower prices (potential buy opportunities)
- **Red**: Higher prices (potential sell opportunities)
- **Intensity**: Magnitude of price difference

---

## Price Query

Access the Price Query page at `/[locale]/price-query` for detailed price analysis.

### Selectors Panel

Configure your query parameters:

#### Oracle Provider Selection

Select one or more oracle providers:

- Chainlink
- Pyth Network
- API3
- RedStone
- DIA
- WINkLink

Multi-select enabled - compare prices across multiple oracles simultaneously.

#### Symbol/Pair Selection

Choose from supported trading pairs:

- BTC/USD
- ETH/USD
- And many more...

#### Blockchain Selection

Select target blockchain networks:

- Ethereum
- Arbitrum
- Optimism
- Polygon
- Avalanche
- Base
- BNB Chain
- Solana
- And others...

Only chains supported by selected oracles are available.

#### Time Range Selection

Choose historical data period:

- 1 Hour
- 6 Hours
- 24 Hours
- 7 Days
- 30 Days

### Statistics Grid

View calculated statistics from query results:

| Statistic          | Description                        |
| ------------------ | ---------------------------------- |
| Average Price      | Mean price across selected sources |
| Maximum Price      | Highest reported price             |
| Minimum Price      | Lowest reported price              |
| Price Range        | Difference between max and min     |
| Standard Deviation | Price volatility measure           |
| Std Dev %          | Standard deviation as percentage   |
| Data Points        | Number of price sources queried    |
| Query Duration     | Time taken to fetch data           |
| 24h Change %       | Average 24-hour price change       |

### Price Results Table

A sortable, filterable table displaying:

| Column     | Description                   |
| ---------- | ----------------------------- |
| Oracle     | Oracle provider name          |
| Blockchain | Chain where price is reported |
| Price      | Current price value           |
| Timestamp  | Last update time              |
| Source     | Data source identifier        |
| Deviation  | Price deviation from average  |

**Table Features**:

- Sort by any column
- Filter by text search
- Expand rows for detailed information
- Highlight outliers

### Price Chart

Interactive price visualization:

#### Chart Features

- **Multi-series Display**: View prices from multiple oracles
- **Zoom Controls**: Zoom in/out for detailed analysis
- **Pan Navigation**: Drag to view different time periods
- **Legend Toggle**: Show/hide individual series
- **Tooltip Details**: Hover for detailed price information

#### Technical Indicators

Enable technical analysis overlays:

**RSI (Relative Strength Index)**

- Period: 14 (configurable)
- Overbought/Oversold zones marked
- Visual divergence indicators

**MACD (Moving Average Convergence Divergence)**

- Fast Period: 12
- Slow Period: 26
- Signal Period: 9
- Histogram visualization

**Bollinger Bands**

- Standard deviation bands
- Middle band (SMA)
- Upper and lower bands

### Data Quality Panel

Assess data reliability:

| Metric       | Description                      |
| ------------ | -------------------------------- |
| Freshness    | Time since last update           |
| Completeness | Percentage of successful queries |
| Reliability  | Historical accuracy score        |
| Source Count | Number of data sources           |

### Comparison Mode

Enable comparison analysis:

- Compare current period with historical period
- Side-by-side statistics comparison
- Visual difference indicators

### Quick Links

Access related features:

- Cross-Oracle Comparison
- Cross-Chain Analysis
- Oracle-specific pages

### Query History

Access previous queries:

- View recent query configurations
- Quickly re-run previous queries
- Clear history option

---

## Cross-Oracle Comparison

Access at `/[locale]/cross-oracle` for multi-oracle price analysis.

### Filter Panel

Configure analysis parameters:

#### Oracle Selection

- Toggle individual oracles on/off
- Multi-select support
- Visual color coding for each oracle

#### Symbol Selection

- Choose trading pair to analyze
- Quick symbol switching

#### Time Range

- 1 Hour to 1 Year options
- All Time historical view

#### Deviation Filter

Filter results by price deviation:

- **Excellent**: < 0.1% deviation
- **Good**: 0.1% - 0.5% deviation
- **Poor**: > 0.5% deviation

### Statistics Cards

Key metrics displayed:

| Card             | Description             |
| ---------------- | ----------------------- |
| Average Price    | Mean across all oracles |
| Weighted Average | Volume-weighted average |
| Max Price        | Highest reported price  |
| Min Price        | Lowest reported price   |
| Price Range      | Max - Min spread        |
| Std Dev %        | Volatility measure      |
| Variance         | Statistical variance    |
| Consistency      | Data consistency rating |

### Price Table

Detailed price comparison table:

| Column    | Description                        |
| --------- | ---------------------------------- |
| Oracle    | Provider name with color indicator |
| Price     | Current price                      |
| Deviation | % deviation from average           |
| Timestamp | Last update time                   |
| Z-Score   | Statistical outlier indicator      |
| Status    | Data quality status                |

**Interactive Features**:

- Sort by any column
- Expand rows for historical data
- Keyboard navigation (Arrow keys, Enter, Escape)
- Outlier highlighting

### Price Trend Chart

Multi-series line chart with:

- Individual oracle price lines
- Average price reference line
- Standard deviation bands
- Zoom and pan controls
- Fullscreen mode

### Advanced Analysis Tabs

#### Charts Tab

- Price deviation heatmap
- Price distribution box plot
- Volatility analysis charts

#### Advanced Tab

- Moving Average analysis
- Bollinger Bands overlay
- ATR (Average True Range) indicator
- Gas fee comparison
- Data quality trends

#### Snapshots Tab

- Save current state as snapshot
- Compare with historical snapshots
- Share snapshots publicly

#### Performance Tab

- Latency distribution histogram
- Oracle performance ranking
- Price correlation matrix

### Outlier Detection

Automatic outlier identification:

- Z-score based detection
- Visual alerts for anomalies
- Quick navigation to outlier details
- Statistical summary of outliers

### Colorblind Mode

Toggle colorblind-friendly visualization:

- Alternative color palette
- Pattern-based differentiation
- Enhanced contrast

### Favorites Integration

Save current configuration:

- Save oracle/symbol combinations
- Quick access from favorites menu
- Apply saved configurations instantly

---

## Cross-Chain Analysis

Access at `/cross-chain` for blockchain-level price analysis.

### Filter Configuration

#### Chain Selection

- Select target blockchains
- Multi-chain comparison
- Visual chain indicators

#### Symbol Selection

- Choose trading pair
- Cross-chain price comparison

### Price Spread Heatmap

Visual matrix showing:

- Price differences across chains
- Color-coded spread indicators
- Interactive cell details
- Timestamp information

### Statistics Dashboard

Comprehensive statistics display:

| Statistic                | Description            |
| ------------------------ | ---------------------- |
| Average Price            | Mean across chains     |
| Median Price             | Middle value           |
| Highest/Lowest           | Price extremes         |
| Price Range              | Spread calculation     |
| IQR                      | Interquartile range    |
| Standard Deviation       | Volatility measure     |
| Skewness                 | Distribution asymmetry |
| Kurtosis                 | Distribution shape     |
| 95% CI                   | Confidence interval    |
| Coefficient of Variation | Relative variability   |
| Consistency Rating       | Data quality score     |
| Data Points              | Total observations     |

### Price Distribution Analysis

#### Histogram

- Price frequency distribution
- Mean and median reference lines
- Standard deviation markers

#### Box Plot

- Chain-level price distribution
- Outlier identification
- Quartile visualization

### Correlation Matrix

Cross-chain price correlation:

- Color-coded correlation values
- Click cells for detailed analysis
- Export correlation data

### Rolling Correlation Chart

Time-series correlation analysis:

- Dynamic correlation tracking
- Configurable window size
- Trend identification

### Cointegration Analysis

Statistical cointegration testing:

- Engle-Granger test results
- Long-term relationship analysis
- Mean reversion indicators

### Volatility Surface

3D volatility visualization:

- Time vs. chain volatility
- Surface plot rendering
- Interactive rotation

### Stability Analysis Table

Chain-level stability metrics:

| Column               | Description             |
| -------------------- | ----------------------- |
| Blockchain           | Chain name              |
| Data Integrity       | Completeness score      |
| Price Volatility     | Volatility percentage   |
| Price Jump Frequency | Sudden change count     |
| Stability Rating     | Overall stability score |

### Colorblind-Friendly Mode

Enhanced accessibility:

- Alternative color schemes
- Pattern-based differentiation
- Improved contrast ratios

---

## Oracle-Specific Pages

Oracle-specific analytics are accessible through the Price Query page by selecting specific oracle providers.

### Accessing Oracle Data

1. Navigate to `/[locale]/price-query`
2. Select the desired oracle provider from the selector
3. Choose the trading pair and blockchain
4. View oracle-specific statistics and charts

### Pyth Network (`/pyth-network`)

Dedicated page for Pyth Network with:

#### Features

- **Publisher Analytics**: Data publisher performance
- **Publisher Contribution**: Publisher reliability scores
- **Price Stream**: Real-time price streaming
- **Update Frequency Heatmap**: Hourly activity visualization
- **Confidence Intervals**: Price confidence bands
- **Confidence Alerts**: Threshold-based alerts
- **Data Quality Scores**: Quality metrics panel

### Supported Oracle Providers

All oracle providers can be accessed through the Price Query page:

| Provider  | Description                  | Key Features                                  |
| --------- | ---------------------------- | --------------------------------------------- |
| Chainlink | Decentralized oracle network | Node analytics, extensive data feeds          |
| Pyth      | High-frequency data oracle   | Publisher analytics, confidence intervals     |
| API3      | First-party oracle solution  | Airnode deployments, quantifiable security    |
| RedStone  | Modular oracle solution      | Data streams, cross-chain support             |
| DIA       | Open-source oracle           | NFT floor price data, transparent methodology |
| WINkLink  | TRON ecosystem oracle        | Gaming data feeds, entertainment focus        |

### Oracle Statistics

Each oracle provides the following statistics:

| Statistic          | Description                        |
| ------------------ | ---------------------------------- |
| Average Price      | Mean price across selected sources |
| Maximum Price      | Highest reported price             |
| Minimum Price      | Lowest reported price              |
| Price Range        | Difference between max and min     |
| Standard Deviation | Price volatility measure           |
| Confidence Score   | Data reliability rating            |
| Last Updated       | Timestamp of last update           |

---

## Data Transparency Features

The platform provides comprehensive data transparency features to ensure users understand the source and quality of data.

### Data Source Indicators

Located throughout the interface, data source indicators show:

- **Source Name**: The originating data provider
- **Update Time**: Last data refresh timestamp
- **Confidence Score**: Data reliability rating
- **Verification Status**: On-chain verification where applicable

### Data Quality Panel

Available on most oracle pages, the data quality panel displays:

| Metric       | Description                      |
| ------------ | -------------------------------- |
| Freshness    | Time since last update           |
| Completeness | Percentage of successful queries |
| Reliability  | Historical accuracy score        |
| Source Count | Number of data sources           |

---

## Alerts Management

Access at `/alerts` to configure price alerts.

### Creating Price Alerts

#### Alert Configuration

1. **Alert Name** (Optional): Custom name for the alert
2. **Trading Pair**: Select symbol to monitor (e.g., BTC, ETH)
3. **Oracle** (Optional): Specific oracle or all oracles
4. **Blockchain** (Optional): Specific chain or all chains
5. **Condition Type**:
   - **Above**: Trigger when price exceeds target
   - **Below**: Trigger when price drops below target
   - **Change Percent**: Trigger on percentage change
6. **Target Value**: Price threshold or percentage
7. **Enable Toggle**: Activate/deactivate alert

#### Alert Creation Steps

1. Navigate to `/alerts`
2. Fill in the alert configuration form
3. Click "Create Alert"
4. Alert appears in the active alerts list

### Managing Active Alerts

#### Alert List Features

| Column    | Description            |
| --------- | ---------------------- |
| Name      | Alert identifier       |
| Symbol    | Monitored trading pair |
| Condition | Alert condition type   |
| Target    | Threshold value        |
| Status    | Active/Inactive        |
| Created   | Creation timestamp     |
| Actions   | Edit, Delete, Toggle   |

#### Actions

- **Toggle**: Enable/disable alert
- **Edit**: Modify alert parameters
- **Delete**: Remove alert permanently
- **Refresh**: Update alert list

### Alert History

View triggered alerts:

| Column        | Description         |
| ------------- | ------------------- |
| Alert Name    | Associated alert    |
| Symbol        | Trading pair        |
| Triggered At  | Trigger timestamp   |
| Trigger Value | Price at trigger    |
| Condition     | Alert condition     |
| Acknowledged  | Confirmation status |

### Acknowledging Alerts

1. Alerts appear as notifications at page top
2. Click "View Details" to see alert information
3. Click "Dismiss" to acknowledge the alert
4. Acknowledged alerts move to history

### Notification Preferences

Configure in Settings:

- Browser notifications
- Email notifications (if configured)
- Alert frequency limits

---

## Favorites

Access at `/[locale]/favorites` to manage saved configurations.

### Adding Favorites

#### From Cross-Oracle Page

1. Configure your oracle selection and symbol
2. Click the "Favorite" button (heart icon)
3. Enter a name for the favorite
4. Click "Save"

#### From Price Query Page

1. Set your query parameters
2. Click the favorite button
3. Save the configuration

### Managing Favorites

#### Favorites Manager

| Column  | Description         |
| ------- | ------------------- |
| Name    | Favorite name       |
| Type    | Configuration type  |
| Config  | Saved parameters    |
| Created | Creation date       |
| Actions | Apply, Edit, Delete |

#### Actions

- **Apply**: Load configuration and navigate to page
- **Edit**: Modify favorite name and settings
- **Delete**: Remove from favorites
- **Quick Apply**: One-click configuration load

### Configuration Types

| Type          | Description                 |
| ------------- | --------------------------- |
| Oracle Config | Oracle selection and symbol |
| Symbol        | Trading pair preset         |
| Chain Config  | Blockchain configuration    |

### Quick Access

Access favorites from:

- Navigation dropdown menu
- Favorites page
- Quick access buttons on relevant pages

---

## Snapshots

Capture and compare price data states.

### Creating Snapshots

#### From Cross-Oracle Page

1. Configure your analysis view
2. Click "Save Snapshot" button
3. Snapshot captures:
   - Current prices
   - Selected oracles
   - Statistics
   - Timestamp

### Snapshot Manager

#### Features

- View all saved snapshots
- Snapshot metadata display:
  - Symbol
  - Timestamp
  - Oracle count
  - Average price
  - Deviation

#### Actions

- **Select**: Choose for comparison
- **Share**: Generate public link
- **Copy Link**: Copy share URL
- **Delete**: Remove snapshot

### Comparing Snapshots

1. Select a snapshot from the list
2. View comparison panel showing:
   - Current vs. snapshot statistics
   - Price differences
   - Percentage changes
   - Visual comparison charts

### Sharing Snapshots

1. Click share icon on snapshot
2. Toggle sharing on
3. Copy the generated URL
4. Share URL provides read-only view

### Cloud Sync

For logged-in users:

- Snapshots sync to cloud
- Access from any device
- Migration from local storage available

---

## User Settings

Access at `/settings` to configure preferences.

### Profile Panel

#### Profile Settings

- **Display Name**: Your visible name
- **Email**: Account email (read-only)
- **Avatar**: Profile picture

#### Profile Actions

- Update display name
- Change avatar
- Save changes

### Preferences Panel

#### Theme Settings

- **Light Mode**: Default light theme
- **Dark Mode**: Dark color scheme
- **System**: Follow system preference

#### Language Settings

- **English**: English interface
- **Chinese (Simplified)**: Simplified Chinese interface

#### Display Preferences

- **Default Time Range**: Preferred analysis period
- **Chart Type**: Default visualization
- **Number Format**: Number display preferences

### Notification Panel

#### Alert Notifications

- **Browser Notifications**: Enable desktop alerts
- **Notification Permission**: Request/Manage permission
- **Alert Sound**: Audio notification toggle

#### Email Settings

- **Email Alerts**: Email notification toggle
- **Digest Frequency**: Summary email frequency
- **Alert Types**: Select alert categories

### Data Management Panel

#### Data Export

- **Export All Data**: Download all user data
- **Export Format**: Choose export format
- **Include History**: Include historical data

#### Data Deletion

- **Clear History**: Remove query history
- **Delete Snapshots**: Remove all snapshots
- **Delete Account**: Permanent account deletion

---

## Data Export

Export platform data in multiple formats.

### Export Formats

| Format | Description                | Use Case             |
| ------ | -------------------------- | -------------------- |
| CSV    | Comma-separated values     | Spreadsheet analysis |
| JSON   | JavaScript Object Notation | API integration      |
| Excel  | Microsoft Excel format     | Business reporting   |
| PDF    | Portable Document Format   | Documentation        |
| PNG    | Image format               | Visual sharing       |

### Export Configuration

#### Field Selection

Choose which fields to include:

- Oracle name
- Price values
- Timestamps
- Deviation metrics
- Quality scores
- Chain information

#### Time Range Selection

- Preset ranges (1H, 24H, 7D, 30D, 90D, 1Y)
- Custom date range picker
- All time option

#### Data Types

Select data categories:

- Oracle Market Data
- Asset Data
- Trend Data
- Chain Breakdown
- Protocol Details
- Risk Metrics
- Anomalies

### Export Locations

#### Price Query

- Export button in results section
- Full data export
- Chart-only export

#### Cross-Oracle

- Floating action button
- Quick export options
- Snapshot export

#### Cross-Chain

- Export buttons in header
- CSV and JSON options
- Analysis data export

### Scheduled Exports

Configure automatic exports:

1. Navigate to Settings > Data Management
2. Configure export schedule
3. Select data types and format
4. Set delivery method (email/download)
5. Activate scheduled export

### Export File Naming

Automatic naming convention:

```
oracle-export-[data-type]-[timestamp].[extension]
```

Example:

```
oracle-export-oracleMarket-2024-01-15T10-30-00.csv
```

---

## Keyboard Shortcuts

Speed up navigation with keyboard shortcuts:

| Shortcut        | Action                  |
| --------------- | ----------------------- |
| `R`             | Refresh current data    |
| `/`             | Focus search box        |
| `?`             | Show keyboard shortcuts |
| `Esc`           | Close modals/dropdowns  |
| `Arrow Up/Down` | Navigate tables         |
| `Enter`         | Select/expand row       |

---

## Tips and Best Practices

### For Traders

1. Set up price alerts for key levels
2. Use cross-oracle comparison for arbitrage opportunities
3. Monitor the arbitrage heatmap for price discrepancies
4. Save favorite configurations for quick access

### For Analysts

1. Use the correlation matrix for relationship analysis
2. Export data for external analysis
3. Create snapshots to track market changes
4. Leverage technical indicators for trend analysis

### For Developers

1. Use JSON export for API integration
2. Monitor data quality scores
3. Track oracle latency metrics
4. Analyze cross-chain consistency

### For Risk Managers

1. Monitor anomaly detection alerts
2. Review risk metrics dashboard
3. Track volatility indicators
4. Assess data source credibility

---

## Troubleshooting

### Common Issues

#### Data Not Loading

1. Check internet connection
2. Refresh the page
3. Clear browser cache
4. Check WebSocket connection status

#### Alerts Not Triggering

1. Verify alert is enabled
2. Check notification permissions
3. Confirm target value is correct
4. Review alert history

#### Export Fails

1. Check available disk space
2. Try a different format
3. Reduce data range
4. Disable browser pop-up blockers

### Getting Help

- **Documentation**: Check the docs page
- **GitHub Issues**: Report bugs on GitHub
- **Community**: Join the community discussions

---

## Glossary

| Term                    | Definition                                            |
| ----------------------- | ----------------------------------------------------- |
| **TVS**                 | Total Value Secured - total value protected by oracle |
| **Oracle**              | Service providing external data to blockchains        |
| **Price Feed**          | Continuous stream of price data                       |
| **Deviation**           | Difference from average or expected value             |
| **Latency**             | Time delay in data delivery                           |
| **Confidence Interval** | Statistical range for price estimates                 |
| **RSI**                 | Relative Strength Index - momentum indicator          |
| **MACD**                | Moving Average Convergence Divergence                 |
| **Bollinger Bands**     | Volatility indicator using standard deviation         |
| **Z-Score**             | Statistical measure of deviation from mean            |
| **Cointegration**       | Long-term equilibrium relationship between series     |
| **IQR**                 | Interquartile Range - spread of middle 50% of data    |

---

_Last Updated: 2024_

_Insight Oracle Data Analytics Platform - Empowering data-driven decisions in the oracle ecosystem._
