--
-- Datalakes PostgreSQL database dump
--

-- Dumped from database version 11.12

CREATE DATABASE datalakes WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE = 'en_US.UTF-8';


\connect datalakes

CREATE SEQUENCE public.clonestatus_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;

CREATE TABLE public.clonestatus (
    id integer DEFAULT nextval('public.clonestatus_id_seq'::regclass) NOT NULL,
    status character varying,
    message character varying,
    repositories_id integer
);

CREATE SEQUENCE public.datasetparameters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;

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

CREATE SEQUENCE public.datasets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;

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
    monitor integer
);

CREATE SEQUENCE public.files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;

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

CREATE SEQUENCE public.lake_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;

CREATE TABLE public.lakes (
    id integer DEFAULT nextval('public.lake_id_seq'::regclass) NOT NULL,
    name character varying,
    elevation numeric,
    depth numeric,
    morphology boolean
);

CREATE SEQUENCE public.license_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;

CREATE TABLE public.licenses (
    id integer DEFAULT nextval('public.license_id_seq'::regclass) NOT NULL,
    name character varying,
    description character varying,
    link character varying
);

CREATE SEQUENCE public.organisation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.organisations (
    id integer DEFAULT nextval('public.organisation_id_seq'::regclass) NOT NULL,
    name character varying,
    link character varying
);

CREATE SEQUENCE public.parameter_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.parameters (
    id integer DEFAULT nextval('public.parameter_id_seq'::regclass) NOT NULL,
    name character varying,
    cfname character varying,
    description character varying,
    unit character varying,
    characteristic character varying,
    german character varying
);

CREATE SEQUENCE public.person_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.persons (
    id integer DEFAULT nextval('public.person_id_seq'::regclass) NOT NULL,
    name character varying,
    email character varying,
    organisations_id integer
);

CREATE SEQUENCE public.project_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.projects (
    id integer DEFAULT nextval('public.project_id_seq'::regclass) NOT NULL,
    name character varying,
    link character varying
);

CREATE SEQUENCE public.repositories_id_seq
    START WITH 420
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;

CREATE TABLE public.repositories (
    id integer DEFAULT nextval('public.repositories_id_seq'::regclass) NOT NULL,
    ssh character varying,
    branch character varying
);

CREATE SEQUENCE public.sensor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.sensors (
    id integer DEFAULT nextval('public.sensor_id_seq'::regclass) NOT NULL,
    name character varying,
    manufacturer character varying,
    accuracy character varying,
    link character varying
);
