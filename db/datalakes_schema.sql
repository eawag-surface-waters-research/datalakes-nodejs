--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4
-- Dumped by pg_dump version 16.8 (Ubuntu 16.8-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: datalakes
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO datalakes;

--
-- Name: clonestatus_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.clonestatus_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.clonestatus_id_seq OWNER TO datalakes;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clonestatus; Type: TABLE; Schema: public; Owner: datalakes
--

CREATE TABLE public.clonestatus (
    id integer DEFAULT nextval('public.clonestatus_id_seq'::regclass) NOT NULL,
    status character varying,
    message character varying,
    repositories_id integer
);


ALTER TABLE public.clonestatus OWNER TO datalakes;

--
-- Name: datasetparameters_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.datasetparameters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.datasetparameters_id_seq OWNER TO datalakes;

--
-- Name: datasetparameters; Type: TABLE; Schema: public; Owner: datalakes
--

CREATE TABLE public.datasetparameters (
    id integer DEFAULT nextval('public.datasetparameters_id_seq'::regclass) NOT NULL,
    datasets_id integer,
    parameters_id integer,
    sensors_id integer,
    axis character varying,
    parseparameter character varying,
    unit character varying,
    link integer,
    detail character varying
);


ALTER TABLE public.datasetparameters OWNER TO datalakes;

--
-- Name: datasets_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.datasets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.datasets_id_seq OWNER TO datalakes;

--
-- Name: datasets; Type: TABLE; Schema: public; Owner: datalakes
--

CREATE TABLE public.datasets (
    id integer DEFAULT nextval('public.datasets_id_seq'::regclass) NOT NULL,
    title character varying,
    description character varying,
    origin character varying,
    mapplot character varying,
    mapplotfunction character varying,
    datasource character varying,
    datasourcelink character varying,
    plotproperties json,
    citation character varying,
    downloads integer,
    fileconnect character varying,
    liveconnect character varying,
    renku integer,
    prefile character varying,
    prescript character varying,
    mindatetime timestamp with time zone,
    maxdatetime timestamp with time zone,
    mindepth numeric,
    maxdepth numeric,
    latitude numeric,
    longitude numeric,
    licenses_id integer,
    organisations_id integer,
    repositories_id integer,
    lakes_id integer,
    persons_id integer,
    projects_id integer,
    embargo integer,
    password character varying,
    accompanyingdata character varying,
    dataportal character varying,
    monitor integer,
    internal character varying
);


ALTER TABLE public.datasets OWNER TO datalakes;

--
-- Name: files_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.files_id_seq OWNER TO datalakes;

--
-- Name: files; Type: TABLE; Schema: public; Owner: datalakes
--

CREATE TABLE public.files (
    id integer DEFAULT nextval('public.files_id_seq'::regclass) NOT NULL,
    datasets_id integer,
    filelink character varying,
    filetype character varying,
    filelineage integer,
    mindatetime timestamp with time zone,
    maxdatetime timestamp with time zone,
    mindepth numeric,
    maxdepth numeric,
    latitude numeric,
    longitude numeric,
    connect character varying,
    parameters_connectid integer
);


ALTER TABLE public.files OWNER TO datalakes;

--
-- Name: lake_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.lake_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.lake_id_seq OWNER TO datalakes;

--
-- Name: lakes; Type: TABLE; Schema: public; Owner: datalakes
--

CREATE TABLE public.lakes (
    id integer DEFAULT nextval('public.lake_id_seq'::regclass) NOT NULL,
    name character varying,
    elevation numeric,
    depth numeric,
    morphology boolean
);


ALTER TABLE public.lakes OWNER TO datalakes;

--
-- Name: license_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.license_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.license_id_seq OWNER TO datalakes;

--
-- Name: licenses; Type: TABLE; Schema: public; Owner: datalakes
--

CREATE TABLE public.licenses (
    id integer DEFAULT nextval('public.license_id_seq'::regclass) NOT NULL,
    name character varying,
    description character varying,
    link character varying
);


ALTER TABLE public.licenses OWNER TO datalakes;

--
-- Name: maintenance_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.maintenance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.maintenance_id_seq OWNER TO datalakes;

--
-- Name: maintenance; Type: TABLE; Schema: public; Owner: datalakes
--

CREATE TABLE public.maintenance (
    id integer DEFAULT nextval('public.maintenance_id_seq'::regclass) NOT NULL,
    parameters_id integer,
    starttime timestamp with time zone,
    endtime timestamp with time zone,
    depths character varying,
    description character varying,
    reporter character varying,
    datasets_id integer,
    datasetparameters_id integer
);


ALTER TABLE public.maintenance OWNER TO datalakes;

--
-- Name: monitor_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.monitor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.monitor_id_seq OWNER TO datalakes;

--
-- Name: organisations; Type: TABLE; Schema: public; Owner: datalakes
--

CREATE TABLE public.organisations (
    id integer NOT NULL,
    name character varying,
    link character varying
);


ALTER TABLE public.organisations OWNER TO datalakes;

--
-- Name: organisation_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.organisation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organisation_id_seq OWNER TO datalakes;

--
-- Name: organisation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: datalakes
--

ALTER SEQUENCE public.organisation_id_seq OWNED BY public.organisations.id;


--
-- Name: parameters; Type: TABLE; Schema: public; Owner: datalakes
--

CREATE TABLE public.parameters (
    id integer NOT NULL,
    name character varying,
    cfname character varying,
    description character varying,
    unit character varying,
    characteristic character varying,
    german character varying,
    french character varying,
    italian character varying
);


ALTER TABLE public.parameters OWNER TO datalakes;

--
-- Name: parameter_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.parameter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parameter_id_seq OWNER TO datalakes;

--
-- Name: parameter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: datalakes
--

ALTER SEQUENCE public.parameter_id_seq OWNED BY public.parameters.id;


--
-- Name: persons; Type: TABLE; Schema: public; Owner: datalakes
--

CREATE TABLE public.persons (
    id integer NOT NULL,
    name character varying,
    email character varying,
    organisations_id integer
);


ALTER TABLE public.persons OWNER TO datalakes;

--
-- Name: person_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.person_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.person_id_seq OWNER TO datalakes;

--
-- Name: person_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: datalakes
--

ALTER SEQUENCE public.person_id_seq OWNED BY public.persons.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: datalakes
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name character varying,
    link character varying
);


ALTER TABLE public.projects OWNER TO datalakes;

--
-- Name: project_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.project_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_id_seq OWNER TO datalakes;

--
-- Name: project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: datalakes
--

ALTER SEQUENCE public.project_id_seq OWNED BY public.projects.id;


--
-- Name: repositories_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.repositories_id_seq
    START WITH 420
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


ALTER SEQUENCE public.repositories_id_seq OWNER TO datalakes;

--
-- Name: repositories; Type: TABLE; Schema: public; Owner: datalakes
--

CREATE TABLE public.repositories (
    id integer DEFAULT nextval('public.repositories_id_seq'::regclass) NOT NULL,
    ssh character varying,
    branch character varying
);


ALTER TABLE public.repositories OWNER TO datalakes;

--
-- Name: sensors; Type: TABLE; Schema: public; Owner: datalakes
--

CREATE TABLE public.sensors (
    id integer NOT NULL,
    name character varying,
    manufacturer character varying,
    accuracy character varying,
    link character varying
);


ALTER TABLE public.sensors OWNER TO datalakes;

--
-- Name: sensor_id_seq; Type: SEQUENCE; Schema: public; Owner: datalakes
--

CREATE SEQUENCE public.sensor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sensor_id_seq OWNER TO datalakes;

--
-- Name: sensor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: datalakes
--

ALTER SEQUENCE public.sensor_id_seq OWNED BY public.sensors.id;


--
-- Name: organisations id; Type: DEFAULT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.organisations ALTER COLUMN id SET DEFAULT nextval('public.organisation_id_seq'::regclass);


--
-- Name: parameters id; Type: DEFAULT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.parameters ALTER COLUMN id SET DEFAULT nextval('public.parameter_id_seq'::regclass);


--
-- Name: persons id; Type: DEFAULT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.persons ALTER COLUMN id SET DEFAULT nextval('public.person_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.project_id_seq'::regclass);


--
-- Name: sensors id; Type: DEFAULT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.sensors ALTER COLUMN id SET DEFAULT nextval('public.sensor_id_seq'::regclass);


--
-- Name: clonestatus clonestatus_pkey; Type: CONSTRAINT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.clonestatus
    ADD CONSTRAINT clonestatus_pkey PRIMARY KEY (id);


--
-- Name: datasetparameters datasetparameters_pkey; Type: CONSTRAINT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.datasetparameters
    ADD CONSTRAINT datasetparameters_pkey PRIMARY KEY (id);


--
-- Name: datasets datasets_pkey; Type: CONSTRAINT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.datasets
    ADD CONSTRAINT datasets_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: lakes lake_pkey; Type: CONSTRAINT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.lakes
    ADD CONSTRAINT lake_pkey PRIMARY KEY (id);


--
-- Name: licenses license_pkey; Type: CONSTRAINT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT license_pkey PRIMARY KEY (id);


--
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- Name: organisations organisation_pkey; Type: CONSTRAINT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisation_pkey PRIMARY KEY (id);


--
-- Name: parameters parameter_pkey; Type: CONSTRAINT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.parameters
    ADD CONSTRAINT parameter_pkey PRIMARY KEY (id);


--
-- Name: persons person_pkey; Type: CONSTRAINT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT person_pkey PRIMARY KEY (id);


--
-- Name: projects project_pkey; Type: CONSTRAINT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT project_pkey PRIMARY KEY (id);


--
-- Name: repositories repositories_pkey; Type: CONSTRAINT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_pkey PRIMARY KEY (id);


--
-- Name: sensors sensor_pkey; Type: CONSTRAINT; Schema: public; Owner: datalakes
--

ALTER TABLE ONLY public.sensors
    ADD CONSTRAINT sensor_pkey PRIMARY KEY (id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: datalakes
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--
