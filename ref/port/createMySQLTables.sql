CREATE TABLE AppUser (  -- PastKey User account
  dsId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  created VARCHAR(256) NOT NULL,
  modified VARCHAR(256) NOT NULL,
  batchconv VARCHAR(256),
  importid BIGINT UNIQUE,
  email VARCHAR(256) NOT NULL UNIQUE,
  phash VARCHAR(256) NOT NULL,
  status VARCHAR(256),
  actsends LONGTEXT,
  actcode VARCHAR(256),
  accessed VARCHAR(256),
  name VARCHAR(256),
  title VARCHAR(256),
  web LONGTEXT,
  lang VARCHAR(256),
  settings LONGTEXT,
  remtls LONGTEXT,
  completed LONGTEXT,
  started LONGTEXT,
  built LONGTEXT,
  orgid BIGINT,
  lev INT,
  PRIMARY KEY (dsId)
);
ALTER TABLE AppUser AUTO_INCREMENT = 2020;

CREATE TABLE DayCount (  -- Traffic access accumulator
  dsId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  created VARCHAR(256) NOT NULL,
  modified VARCHAR(256) NOT NULL,
  batchconv VARCHAR(256),
  importid BIGINT UNIQUE,
  tstamp VARCHAR(256) NOT NULL,
  rtype VARCHAR(256) NOT NULL,
  detail LONGTEXT,
  PRIMARY KEY (dsId)
);
ALTER TABLE DayCount AUTO_INCREMENT = 2020;

CREATE TABLE Organization (  -- A group building timelines
  dsId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  created VARCHAR(256) NOT NULL,
  modified VARCHAR(256) NOT NULL,
  batchconv VARCHAR(256),
  importid BIGINT UNIQUE,
  name VARCHAR(256) NOT NULL UNIQUE,
  code VARCHAR(256) NOT NULL UNIQUE,
  contacturl LONGTEXT,
  projecturl LONGTEXT,
  communities LONGTEXT,
  regions LONGTEXT,
  categories LONGTEXT,
  tags LONGTEXT,
  recpre LONGTEXT,
  PRIMARY KEY (dsId)
);
ALTER TABLE Organization AUTO_INCREMENT = 2020;

CREATE TABLE Point (  -- A data point for use in timelines
  dsId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  created VARCHAR(256) NOT NULL,
  modified VARCHAR(256) NOT NULL,
  batchconv VARCHAR(256),
  importid BIGINT UNIQUE,
  orgid BIGINT,
  source VARCHAR(256),
  date VARCHAR(256) NOT NULL,
  text LONGTEXT NOT NULL,
  refs LONGTEXT,
  qtype VARCHAR(256),
  communities LONGTEXT,
  regions LONGTEXT,
  categories LONGTEXT,
  tags LONGTEXT,
  codes LONGTEXT,
  srclang VARCHAR(256),
  translations LONGTEXT,
  pic LONGBLOB,
  endorsed LONGTEXT,
  stats LONGTEXT,
  PRIMARY KEY (dsId)
);
ALTER TABLE Point AUTO_INCREMENT = 2020;

CREATE TABLE AppService (  -- Processing service access
  dsId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  created VARCHAR(256) NOT NULL,
  modified VARCHAR(256) NOT NULL,
  batchconv VARCHAR(256),
  importid BIGINT UNIQUE,
  name VARCHAR(256) NOT NULL UNIQUE,
  ckey VARCHAR(256),
  csec VARCHAR(256),
  data LONGTEXT,
  PRIMARY KEY (dsId)
);
ALTER TABLE AppService AUTO_INCREMENT = 2020;

CREATE TABLE Timeline (  -- Points + suppviz*, or other timelines
  dsId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  created VARCHAR(256) NOT NULL,
  modified VARCHAR(256) NOT NULL,
  batchconv VARCHAR(256),
  importid BIGINT UNIQUE,
  orgid BIGINT,
  name VARCHAR(256) NOT NULL UNIQUE,
  cname VARCHAR(256),
  slug VARCHAR(256) UNIQUE,
  title VARCHAR(256),
  subtitle VARCHAR(256),
  featured VARCHAR(256),
  lang VARCHAR(256),
  comment LONGTEXT,
  about LONGTEXT,
  ctype VARCHAR(256),
  cids LONGTEXT,
  svs LONGTEXT,
  preb LONGTEXT,
  PRIMARY KEY (dsId)
);
ALTER TABLE Timeline AUTO_INCREMENT = 2020;

CREATE TABLE TLComp (  -- Timeline completion archive record
  dsId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  created VARCHAR(256) NOT NULL,
  modified VARCHAR(256) NOT NULL,
  batchconv VARCHAR(256),
  importid BIGINT UNIQUE,
  userid BIGINT NOT NULL,
  tlid BIGINT NOT NULL,
  username VARCHAR(256),
  tlname VARCHAR(256),
  data LONGTEXT,
  PRIMARY KEY (dsId)
);
ALTER TABLE TLComp AUTO_INCREMENT = 2020;

