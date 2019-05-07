# EOSIO nodeos maintenance utilities

## 0. Install all dependencies

```
yarn install
```

Install PM2:

```
yarn global add pm2
`yarn global bin`/pm2 startup
```

Reference:

<https://pm2.io/doc/zh/runtime/quick-start/>

@google-cloud/storage ResumableUpload may need:

```
mkdir ~/.config
```

## 1. [eos-snapshot-backup.js](eos-snapshot-backup.js)

### Dependencies

```
yarn add node-fetch
yarn add @google-cloud/storage
```

### Add to crontab

```
0 * * * * /home/ubuntu/eos-ops/eos-snapshot-backup.js
```

### Snapshots Download

EOSIO Mainnet: <https://storage.googleapis.com/eosio-snapshot-backups/>

MEET.ONE Sidechain Mainnet: <https://storage.googleapis.com/meetone-snapshot-backups/>

## 2. [eos-block-backup.js](eos-block-backup.js)

### Dependencies

```
yarn add @google-cloud/storage
```

### Add to crontab

```
0 0 * * * /home/ubuntu/eos-ops/eos-block-backup.js
```

### Blocks Download

EOSIO Mainnet: <https://storage.googleapis.com/eosio-block-backups/>

MEET.ONE Sidechain Mainnet: <https://storage.googleapis.com/meetone-block-backups/>

## 3. [bp-monitor.js](bp-monitor.js)

### Dependencies

```
yarn add node-fetch
```

### Telegram Channel

<https://t.me/meetonemainnetstatus>
