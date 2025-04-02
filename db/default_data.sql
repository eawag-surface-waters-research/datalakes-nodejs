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
-- Data for Name: lakes; Type: TABLE DATA; Schema: public; Owner: datalakes
--

COPY public.lakes (id, name, elevation, depth, morphology) FROM stdin;
1	Lake Geneva	372.0	309.0	t
\.


--
-- Data for Name: licenses; Type: TABLE DATA; Schema: public; Owner: datalakes
--

COPY public.licenses (id, name, description, link) FROM stdin;
1	GNU AGPLv3	Permissions of this strongest copyleft license are conditioned on making available complete source code of licensed works and modifications, which include larger works using a licensed work, under the same license. Copyright and license notices must be preserved. Contributors provide an express grant of patent rights. When a modified version is used to provide a service over a network, the complete source code of the modified version must be made available.	https://choosealicense.com/licenses/agpl-3.0/
\.


--
-- Data for Name: organisations; Type: TABLE DATA; Schema: public; Owner: datalakes
--

COPY public.organisations (id, name, link) FROM stdin;
1	Eawag	https://www.eawag.ch/
2	EPFL	https://www.epfl.ch/en/
\.


--
-- Data for Name: parameters; Type: TABLE DATA; Schema: public; Owner: datalakes
--

COPY public.parameters (id, name, cfname, description, unit, characteristic, german, french, italian) FROM stdin;
14	pH	ph	A figure expressing the acidity or alkalinity of a solution on a logarithmic scale on which 7 is neutral, lower values are more acid and higher values more alkaline. The pH is equal to −log10 c, where c is the hydrogen ion concentration in moles per litre.	\N	Chemical	\N	\N	\N
16	Turbidity	turbidity	Turbidity is a dimensionless quantity which is expressed in NTU (Nephelometric Turbidity Units). Turbidity expressed in NTU is the proportion of white light scattered back to a transceiver by the particulate load in a body of water, represented on an arbitrary scale referenced against measurements made in the laboratory on aqueous suspensions of formazine beads.	\N	Physical	\N	\N	\N
3	Longitude	longitude	Longitude is positive eastward; its units of degree_east (or equivalent) indicate this explicitly. In a latitude-longitude system defined with respect to a rotated North Pole, the standard name of grid_longitude should be used instead of longitude. Grid longitude is positive in the grid-eastward direction, but its units should be plain degree.	degrees	Physical	\N	\N	\N
10	Air Pressure	air_pressure	Air pressure is the force per unit area which would be exerted when the moving gas molecules of which the air is composed strike a theoretical surface of any orientation.	Pa	Physical	\N	\N	\N
11	Solar Irradiance	solar_irradiance	The quantity with standard name solar_irradiance, often called Total Solar Irradiance (TSI), is the radiation from the sun integrated over the whole electromagnetic spectrum and over the entire solar disk. The quantity applies outside the atmosphere, by default at a distance of one astronomical unit from the sun, but a coordinate or scalar coordinate variable of distance_from_sun can be used to specify a value other than the default. "Irradiance" means the power per unit area (called radiative flux in other standard names), the area being normal to the direction of flow of the radiant energy.	W m-2	Physical	\N	\N	\N
17	Conductivity	electrical_conductivity	Electrical conductivity (EC) estimates the amount of total dissolved salts (TDS), or the total amount of dissolved ions in the water.	S m-1	Physical	\N	\N	\N
18	Water Pressure	water_pressure	"Water pressure" is the pressure that exists in the medium  water. It includes the pressure due to overlying water, air and any other medium that may be present. 	dbar	Physical	\N	\N	\N
19	Water Velocity Northward	water_velocity_northward	A velocity is a vector quantity. "Northward" indicates a vector component which is positive when directed northward (negative southward).	m s-1	Physical	\N	\N	\N
20	Water Velocity Eastward	water_velocity_eastward	A velocity is a vector quantity. "Eastward" indicates a vector component which is positive when directed eastward (negative westward). 	m s-1	Physical	\N	\N	\N
21	Water Velocity Vertical	water_velocity_vertical	A velocity is a vector quantity. "Vertical" indicates a vector component which is positive when directed upwards (negative downwards).	m s-1	Physical	\N	\N	\N
4	Latitude	latitude	Latitude is positive northward; its units of degree_north (or equivalent) indicate this explicitly. In a latitude-longitude system defined with respect to a rotated North Pole, the standard name of grid_latitude should be used instead of latitude. Grid latitude is positive in the grid-northward direction, but its units should be plain degree.	degrees	Physical	\N	\N	\N
7	Wind Speed	wind_speed	Speed is the magnitude of velocity. Wind is defined as a two-dimensional (horizontal) air velocity vector, with no vertical component. (Vertical motion in the atmosphere has the standard name upward_air_velocity.) The wind speed is the magnitude of the wind velocity.	m s-1	Physical	\N	\N	\N
8	Wind Direction	wind_from_direction	Wind is defined as a two-dimensional (horizontal) air velocity vector, with no vertical component. (Vertical motion in the atmosphere has the standard name upward_air_velocity.) In meteorological reports, the direction of the wind vector is usually (but not always) given as the direction from which it is blowing (wind_from_direction) (westerly, northerly, etc.). In other contexts, such as atmospheric modelling, it is often natural to give the direction in the usual manner of vectors as the heading or the direction to which it is blowing (wind_to_direction) (eastward, southward, etc.) "from_direction" is used in the construction X_from_direction and indicates the direction from which the velocity vector of X is coming.	degrees	Physical	\N	\N	\N
9	Rainfall	thickness_of_rainfall_amount	"Amount" means mass per unit area. The construction thickness_of_[X_]rainfall_amount means the accumulated "depth" of rainfall i.e. the thickness of a layer of liquid water having the same mass per unit area as the rainfall amount.	m	Physical	\N	\N	\N
23	Total Suspended Matter	mass_concentration_of_suspended_matter	Total Suspended Solids (TSS) refers to any particles that are suspended in the water column. These particles can include silt, algae, sediment, and other solids floating in the water (both organic and inorganic). These particles are defined as being large enough to not pass through the filter (through the filtration process) used to separate them from the water.	g m-3	Physical	\N	\N	\N
24	Relative Humidity	relative_humidity	Relative humidity (RH) is the ratio of the partial pressure of water vapor to the equilibrium vapor pressure of water at a given temperature. Relative humidity depends on temperature and the pressure of the system of interest. The same amount of water vapor results in higher relative humidity in cool air than warm air. A related parameter is the dew point.	%	Physical	\N	\N	\N
25	Water Velocity	water_velocity	A velocity is a vector quantity. This is composed of a northern and eastern component. 	m s-1	Physical	\N	\N	\N
13	PAR	photosynthetically_active_radiation	Designates the spectral range (wave band) of solar radiation from 400 to 700 nanometers that photosynthetic organisms are able to use in the process of photosynthesis.	W m-2	Physical	\N	\N	\N
1	Time	time	Time	seconds since January 1, 1970	Physical	Zeit	\N	\N
22	Oxygen Saturation	water_oxygen_saturation	Fractional saturation is the ratio of some measure of concentration to the saturated value of the same quantity.	%	Chemical	Sauerstoffsättigung	Saturation d'oxygène	Saturazione di ossigeno
6	Air Temperature	air_temperature	Air temperature	degrees_C	Physical	Lufttemperatur	Température de l'air	Temperatura dell'aria
12	Dissolved Oxygen	dissolved_oxygen	Dissolved oxygen refers to the level of free, non-compound oxygen present in water or other liquids.	mg L-1	Chemical	Gelöster Sauerstoff	\N	\N
119	Latent Heat Flux	\N	\N	W.m-2	\N	\N	\N	\N
121	Absolute Humidity	absolute_humidity	\N	%	Physical	\N	\N	\N
2	Depth	depth	Depth is the vertical distance below the surface.	m	Physical	Tiefe	Profondeur	Profondità
15	Chlorophyll A	mass_concentration_of_chlorophyll_a	'Mass concentration' means mass per unit volume and is used in the construction mass_concentration_of_X_in_Y, where X is a material constituent of Y. A chemical or biological species denoted by X may be described by a single term such as 'nitrogen' or a phrase such as 'nox_expressed_as_nitrogen'. Chlorophylls are the green pigments found in most plants, algae and cyanobacteria; their presence is essential for photosynthesis to take place. There are several different forms of chlorophyll that occur naturally. All contain a chlorin ring (chemical formula C20H16N4) which gives the green pigment and a side chain whose structure varies. The naturally occurring forms of chlorophyll contain between 35 and 55 carbon atoms. Chlorophyll-a is the most commonly occurring form of natural chlorophyll. The chemical formula of chlorophyll-a is C55H72O5N4Mg.	mg m-3	Biological	\N	\N	\N
26	Range	range_transducer_bin	Vertical distance of each data bin from the acoustic current profilers transducer	m	Physical	\N	\N	\N
28	Standard Deviation	standard_deviation	A measure of the amount of variation or dispersion of a set of values	\N	Error	\N	\N	\N
27	Binary Error Mask	data_binary_mask	data_binary_mask has 1 where condition X is met, 0 elsewhere. 0 = high quality, 1 = low quality. 	\N	Error	\N	\N	\N
29	Upper Confidence Interval	upper_confidence_interval	\N	\N	Error	\N	\N	\N
30	Lower Confidence Interval	lower_confidence_interval	\N	\N	Error	\N	\N	\N
31	Water Velocity Magnitude	water_velocity_magnitude	The magnitude of Northern and Eastern velocity vectors.	m s-1	Physical	\N	\N	\N
32	Water Velocity Lateral Direction	water_velocity_lateral_direction	The direction of Northern and Eastern velocity vectors.	deg	Physical	\N	\N	\N
33	Backscattering	backscattering	Scattering of radiation is its deflection from its incident path without loss of energy. Backwards scattering refers to the sum of scattering into all backward angles i.e. scattering_angle exceeding pi/2 radians. A scattering_angle should not be specified with this quantity. 	%	Physical	\N	\N	\N
34	Net Surface Heat Flux	net_surface_heat_flux	Heat flux or thermal flux, sometimes also referred to as heat flux density, heat-flow density or heat flow rate intensity is a flow of energy per unit of area per unit of time. In SI its units are watts per square metre (W/m2). It has both a direction and a magnitude, and so it is a vector quantity. To define the heat flux at a certain point in space, one takes the limiting case where the size of the surface becomes infinitesimally small.	W m-2	Physical	\N	\N	\N
35	Wind Stress	wind_stress	In physical oceanography and fluid dynamics, the wind stress is the shear stress exerted by the wind on the surface of large bodies of water – such as oceans, seas, estuaries and lakes. It is the force component parallel to the surface, per unit area, as applied by the wind on the water surface.	N m-2	Physical	\N	\N	\N
36	Shear Velocity on Water	shear_velocity_water	Shear Velocity, also called friction velocity, is a form by which a shear stress may be re-written in units of velocity. It is useful as a method in fluid mechanics to compare true velocities, such as the velocity of a flow in a stream, to a velocity that relates shear between layers of flow.	m s-1	Physical	\N	\N	\N
37	Surface Buoyancy Flux	surface_buoyancy_flux	Surface Buoyancy Flux	W kg-1	Physical	\N	\N	\N
38	Salinity	salinity	Salinity is the saltiness or amount of salt dissolved in a body of water, called saline water.	ppt	Chemical	\N	\N	\N
39	Potential Redox	potential_redox	Redox potential (also known as reduction / oxidation potential, 'ROP', pe, ε, or. ) is a measure of the tendency of a chemical species to acquire electrons from or lose electrons to an electrode and thereby be reduced or oxidised respectively. 	mV	Chemical	\N	\N	\N
40	Phycoerythrin	phycoerythrin	Phycoerythrin is a red protein-pigment complex from the light-harvesting phycobiliprotein family, present in red algae and cryptophytes, accessory to the main chlorophyll pigments responsible for photosynthesis.	ug/L	Biological	\N	\N	\N
41	Phycocyanin	phycocyanin	Phycocyanin is a pigment-protein complex from the light-harvesting phycobiliprotein family, along with allophycocyanin and phycoerythrin. It is an accessory pigment to chlorophyll. 	ug/L	Biological	\N	\N	\N
42	Primary Production	primary_production	Primary production is the production of chemical energy in organic compounds by living organisms. The main source of this energy is sunlight but a minute fraction of primary production is driven by lithotrophic organisms using the chemical energy of inorganic molecules.	mg C m^-2 h^-1	Biological	\N	\N	\N
43	Secchi Depth	secchi_depth	A Secchi disk is a metal disk, 8 inches in diameter that is lowered into the water on a cord. The depth that the Secchi disk can no longer be seen through the water is the Secchi depth. When the water transparency is high, the Secchi depth is high.	m	Physical	\N	\N	\N
44	Conductivity (20degC)	conductivity_20degc	Electrical conductivity (EC) estimates the amount of total dissolved salts (TDS), or the total amount of dissolved ions in the water. This is normalized to 20 degC.	microS/cm	Physical	\N	\N	\N
45	Downwelling irradiance	downwelling_irradiance	Downwelling short-wave radiation at the surface has a component due to the direct solar beam, and a diffuse component scattered from atmospheric constituents and reflected from clouds.	W/(m2*nm)	Physical	\N	\N	\N
46	Downwelling radiance	downwelling_radiance	\N	W/(m2*nm*sr)	Physical	\N	\N	\N
47	Upwelling radiance	upwelling_radiance	\N	W/(m2*nm*sr)	Physical	\N	\N	\N
48	Remote sensing reflectance	remote_sensing_reflectance	\N	1/sr	Physical	\N	\N	\N
49	Wavelength	wavelength	\N	nm	Physical	\N	\N	\N
50	kd	kd	Diffuse Attenuation Coefficient of Downwelling Irradiance	m-1	Physical	\N	\N	\N
52	Air Pressure Mean Sea Level	air_pressure_mean_sea_level	Air pressure corrected to mean sea level. Air pressure is the force per unit area which would be exerted when the moving gas molecules of which the air is composed strike a theoretical surface of any orientation.	Pa	Physical	\N	\N	\N
51	Dew Point	dew_point	The dew point is the temperature the air needs to be cooled to (at constant pressure) in order to achieve a relative humidity (RH) of 100%. At this point the air cannot hold more water in the gas form.	degrees_C	Physical	\N	\N	\N
120	Sensible Heat Flux	\N	\N	W.m-2	\N	\N	\N	\N
122	Rainfall Intensity	rainfall_intensity	\N	mm/h	Physical	\N	\N	\N
53	Wind Speed Gust	wind_speed_gust	Gusts are the peak wind speed. Speed is the magnitude of velocity. Wind is defined as a two-dimensional (horizontal) air velocity vector, with no vertical component. (Vertical motion in the atmosphere has the standard name upward_air_velocity.) The wind speed is the magnitude of the wind velocity.	m/s	Physical	\N	\N	\N
82	Attenuation	hyperspectral_attenuation	\N	m-1	Physical	\N	\N	\N
107	Ammonium	ammonium	\N	mgN/L	Chemical	\N	\N	\N
97	Raising Depth	raising_depth	\N	m	Physical	\N	\N	\N
98	Skin Temperature	skin_temperature	\N	degC	Physical	\N	\N	\N
99	Sky Temperature	sky_temperature	\N	degC	Physical	\N	\N	\N
60	Morphology	morphology	Morphology	\N	Physical	\N	\N	\N
64	Density	density	Density, mass of a unit volume of a material substance. The formula for density is d = M/V, where d is density, M is mass, and V is volume. Density is commonly expressed in units of grams per cubic centimetre.	kg/m3	Physical	\N	\N	\N
65	Potential Temperature	potential_temperature	The potential temperature of a parcel of fluid at pressure {\\displaystyle P}P is the temperature that the parcel would attain if adiabatically brought to a standard reference pressure {\\displaystyle P_{0}}P_{{0}}, usually 1,000 hPa (1,000 mb). 	degC	Physical	\N	\N	\N
66	Potential Density	potential_density	The potential density of a fluid parcel at pressure {\\displaystyle P}P is the density that the parcel would acquire if adiabatically brought to a reference pressure {\\displaystyle P_{0}}P_{{0}}, often 1 bar (100 kPa). 	kg/m3	Physical	\N	\N	\N
67	Thorpe Displacements	thorpe_displacements	TBD	m	Physical	\N	\N	\N
69	Ld Sensor Selection	ld_sensor_selection	\N	LdS = 0, LdP = 1	Physical	\N	\N	\N
70	Lu Sensor Selection	lu_sensor_selection	\N	LuS = 0, LuP = 1	Physical	\N	\N	\N
71	Ed Sensor Selection	ed_sensor_selection	\N	EdF = 0, EdA = 1	Physical	\N	\N	\N
61	Duration of ice cover	Ice_duration	Duration of ice cover	days	Physical	\N	\N	\N
62	Ice Off	ice_off	End of ice cover	day of year	Physical	\N	\N	\N
63	Ice On	ice_on	Start of ice cover	day of year	Physical	\N	\N	\N
108	Sodium	sodium	\N	mg/L	Chemical	\N	\N	\N
72	Background Brunt Vaisala frequency squared	Background_Brunt_Vaisala_frequency_squared	\N	1/s2	Physical	\N	\N	\N
73	TKE Dissipation Rate	TKE_dissipation_rate	\N	m2/s3	Physical	\N	\N	\N
74	Temperature Variance Dissipation Rate	Temperature_variance_dissipation_rate	\N	m2/s3	Physical	\N	\N	\N
75	Shear Rate	shear_rate	\N	1/s	Physical	\N	\N	\N
76	Temperature Gradient	temperature_gradient	\N	degC/m	Physical	\N	\N	\N
77	Temperature Gradient	temperature_gradient	\N	degC/m	Physical	\N	\N	\N
78	Light Attenuation Coefficient	light_attenuation_coefficient	\N	m-1	Physical	\N	\N	\N
83	Absorption Line Height	absorption_line_height	\N	m-1	Physical	\N	\N	\N
84	Spectral Attenuation Slope	sprectral_attenuation_slope	\N	m-1	Physical	\N	\N	\N
85	Spectral Light Attenuation Coefficient	spectral_light_attenuation_coefficient	\N	m-1	Physical	\N	\N	\N
86	Water Leaving Reflectance	water_leaving_reflectance	\N	\N	Physical	\N	\N	\N
87	Surface Hyperspectral Downwelling Irradiance	surface_hyperspectral_downwelling_irradiance	\N	μW cm-2 nm-1	Physical	\N	\N	\N
88	Surface Hyperspectral Upwelling Radiance	surface_hyperspectral_upwelling_radiance	\N	μW cm-2 nm-1 sr-1	Physical	\N	\N	\N
79	CDOM	chloromorphic_dissolved_organic_matter	\N	ppb	Chemical	\N	\N	\N
89	Relative Oxygen Saturation	relative_oxygen_saturation	\N	%sat	Chemical	\N	\N	\N
90	Hyperspectral Downwelling Irradiance	hyperspectral_downwelling_irradiance	\N	μW cm-2 nm-1	Physical	\N	\N	\N
91	Hyperspectral Upwelling Radiance	hyperspectral_upwelling_radiance	\N	μW cm-2 nm-1 sr-1	Physical	\N	\N	\N
55	Epilimnion Temperature	epilimnion_temperature	Average temperature of the surface mixed layer	degrees_C	Physical	\N	\N	\N
57	Stratification Onset	stratification_onset	Onset of lake stratification in spring/summer	days	Physical	Beginn Schichtung	\N	\N
58	Stratification Duration	stratification_duration	Duration of summer stratification	days	Physical	Schichtungsdauer	\N	\N
59	Stratification Termination	stratification_termination	Termination of summer stratification	day of year	Physical	Ende Schichtung	\N	\N
68	Surface temperature	surface_water_temperature	Temperature of the top-most sensor	degC	Physical	Oberflächentemperatur	Température de surface	Temperatura superficiale
80	Absorption	hyperspectral_absorption	\N	m-1	Physical	\N	\N	\N
81	Scattering	hyperspectral_scattering	\N	m-1	Physical	\N	\N	\N
96	Lowering Depth	lowering_depth	\N	m	Physical	\N	\N	\N
56	Bottom temperature	bottom_temperature	Water temperature at the deepest measurement point	degrees_C	Physical	Grundtemperatur	Température de fond	Temperatura inferiore
100	Alkalinity	alkalinity	\N	mmol/L	Chemical	\N	\N	\N
101	Dissolved Inorganic Phosphorus	dissolved_inorganic_phosphorus	\N	mgP/L	Chemical	\N	\N	\N
102	Total Dissolved Phosphorus	total_dissolved_phosphorus	\N	mgP/L	Chemical	\N	\N	\N
103	Total Phosphorus	total_phosphorus	\N	mgP/L	Chemical	\N	\N	\N
104	Nitrate	nitrate	\N	mgN/L	Chemical	\N	\N	\N
106	Nitrogen Dioxide	nitrogen_dioxide	\N	mgN/L	Chemical	\N	\N	\N
109	Potassium	potassium	\N	mg/L	Chemical	\N	\N	\N
94	Mixing depth	mixing_depth	mixing depth calculated using temperature	m	Physical	Mischtungstiefe	\N	\N
95	Daily maximum mixing depth	daily_maximum_mixing_depth	Daily maximum of mixing depth (calculated using temperature)	m	Physical	Tägliche maximale Mischungstiefe	\N	\N
110	Whiting	whtiing	\N	\N	Chemical	\N	\N	\N
111	Whiting Area\n	whiting_area	\N	\N	Chemical	\N	\N	\N
112	Battery Level	battery_level	\N	V	Chemical	\N	\N	\N
113	Wave Direction	wave_direction	Direction of waves	deg	Physical	\N	\N	\N
114	Wave Height	wave_height	\N	m	Physical	\N	\N	\N
115	Wave Period	wave_period	\N	s	Physical	\N	\N	\N
116	Water Velocity Cross-Shore	\N	Projected Cross-shore water velocity 	cm.s-1	\N	\N	\N	\N
117	Monin Obukhov length	\N	The Obukhov length (L) measures the relative importance of mechanical shear-generated turbulence and density-driven (buoyancy) fluxes	m	\N	\N	\N	\N
118	Water Velocity Along-Shore	\N	Projected along-shore water velocity	cm s-1	\N	\N	\N	\N
5	Water temperature	water_temperature	Lake water temperature is the in situ temperature of the lake water. To specify the depth at which the temperature applies use a vertical coordinate variable or scalar coordinate variable. There are standard names for lake_surface_temperature, lake_surface_skin_temperature, lake_surface_subskin_temperature and lake_surface_foundation_temperature which can be used to describe data located at the specified surfaces.	degrees_C	Physical	Wassertemperatur	Température de l'eau	Temperatura dell'acqua
123	Heading	heading	Direction of instrument	deg	Physical	\N	\N	\N
124	Roll	roll	Roll of the instrument	deg	Physical	\N	\N	\N
125	Pitch	pitch	Pitch of the instrument	deg	Physical	\N	\N	\N
126	Epilimnion Depth	epilimnion_depth	\N	m	Physical	\N	\N	\N
127	Hypolimnion Temperature	hypolimnion_temperature	\N	degC	Physical	\N	\N	\N
128	Hypolimnion Depth	hypolimnion_depth	\N	m	Physical	\N	\N	\N
129	Surface Layer Thickness	surface_layer_thickness	\N	m	Physical	\N	\N	\N
130	Thermocline Depth	thermocline_depth	\N	m	Physical	\N	\N	\N
131	Wedderburn Number	wedderburn_number	\N	\N	Physical	\N	\N	\N
132	Schmidt Stability	schmidt_stability	\N	kg m-2	Physical	\N	\N	\N
133	Seiche Period	seiche_period	\N	s	Physical	\N	\N	\N
134	Brunt–Väisälä Frequency	brunt_vaisala_frequency	\N	s-2	Physical	\N	\N	\N
135	Mixing Layer/ Monin Obukhov Ratio	Mixing Layer/ Monin Obukhov Ratio	\N	\N	Physical	\N	\N	\N
136	Internal Energy	internal_energy	\N	Joules	Physical	\N	\N	\N
137	Heat Content	heat_content	\N	J	Physical	\N	\N	\N
138	Total nitrogen	\N	\N	mg N/L	\N	\N	\N	\N
139	Calcium	\N	\N	mg/L	\N	\N	\N	\N
140	Total organic carbon	\N	\N	mg C/L	\N	\N	\N	\N
141	Chloride	\N	\N	mg/L	\N	\N	\N	\N
142	Iron	\N	\N	mg/L	\N	\N	\N	\N
143	Magnesium	\N	\N	mg/L	\N	\N	\N	\N
144	Manganese	\N	\N	mg/L	\N	Mangan	Manganèse	\N
145	Magnesium	\N	\N	mg/L	\N	Magnesium	Magnésium	\N
146	Nitrite	\N	\N	mg N/L	\N	Nitrit	Nitrite	\N
147	Orthophosphate	\N	\N	mg P/L	\N	Orthophosphat	Orthophosphate	\N
148	Silica	\N	\N	mg SO2/L	\N	Silica	Silice	\N
149	Sulfate	\N	\N	mg/L	\N	Sulfat	Sulfate	\N
150	Chlorophyll B	\N	\N	ug/L	\N	Chlorophyll B	Chlorophylle B	\N
151	Chlorophyll C	\N	\N	ug/L	\N	Chlorophyll C	Chlorophylle C	\N
152	Chlorophyll + Pheopigments	\N	\N	µg/L	\N	Chlorophyll + Pheopigmente	Chlorophylles + Phéopigments	\N
153	Pheophytine	\N	\N	µg/L	\N	Pheophytin	Phéophytine	\N
154	Interpolation Mask	interpolation_mask	\N	\N	Physical	\N	\N	\N
155	Vapor Pressure	vapor_pressure	The equilibrium vapor pressure is an indication of a liquid's evaporation rate. It relates to the tendency of particles to escape from the liquid (or a solid).	mbar	Physical	Dampfdruck	La pression de vapeur	Pressione del vapore
156	Sensor Speed	sensor_speed	\N	m/s	Physical	\N	\N	\N
157	Sensor Tilt	sensor_tilt	\N	deg	Physical	\N	\N	\N
158	Relative View Azimuth	relative_view_azimuth	\N	deg	Physical	\N	\N	\N
159	Total Radiance	total_radiance	\N	mW m-2 sr-1 nm-1	Physical	\N	\N	\N
160	Incident Sky Radiance	incident_sky_radiance	\N	mW m-2 sr-1 nm-1	Physical	\N	\N	\N
161	Specific conductivity	\N	\N	mS/cm	\N	Spezifische Leitfähigkeit	\N	\N
162	Surface dissolved oxygen		Dissolved oxygen at the lake surface	mg/L	\N	Sauerstoffkonzentration an der Oberfläche	\N	\N
163	Bottom dissolved oxygen	\N	Dissolved oxygen at the lake bottom	mg/L	\N	Sauerstoffkonzentration am Grund	\N	\N
164	Hypolimnetic oxygen	\N	Oxygen mass below 15 m depth	t	\N	Hypolimnetischer Sauerstoff	\N	\N
165	∆14C of dissolved inorganic carbon	\N	\N	‰	Chemical	\N	\N	\N
166	∆14C of dissolved organic carbon	\N	\N	‰	Chemical	\N	\N	\N
167	Dissolved organic carbon	\N	\N	mg/L	Chemical	\N	\N	\N
168	Dissolved inorganic carbon	\N	\N	mg/L	Chemical	\N	\N	\N
169	Fluorescence	fluorescence	Indirect measure of pigment concentration	mg m-3	Biological	\N	\N	\N
170	Water depth	water_depth	Depth of lake at mooring location	m	\N	\N	\N	\N
\.


--
-- Data for Name: persons; Type: TABLE DATA; Schema: public; Owner: datalakes
--

COPY public.persons (id, name, email, organisations_id) FROM stdin;
1	James Runnalls	james.runnalls@eawag.ch	1
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: datalakes
--

COPY public.projects (id, name, link) FROM stdin;
1	Datalakes	https://www.eawag.ch/en/department/siam/projects/datalakes/
2	LéXPLORE	https://wp.unil.ch/lexplore/
\.


--
-- Data for Name: sensors; Type: TABLE DATA; Schema: public; Owner: datalakes
--

COPY public.sensors (id, name, manufacturer, accuracy, link) FROM stdin;
5	Minilog-II-T	Vemco	0.1 °C	https://www.bodc.ac.uk/data/documents/nodb/pdf/minilog2t.pdf
6	TidBit MX2203	Onset	0.2	\N
7	TidBit MX2203 calibrated	Onset (calibrated by Eawag)	0.05	\N
8	Calculated	-	-	\N
9	miniDOT	PME	5 %	\N
10	DO Solo	RBR	2 %	\N
1	Sensor Type NA	Example Manufacturer	+/- 5	https://en.wikipedia.org/wiki/Sensor
11	RBR Solo DO	RBR	2 %	\N
12	RBR CTD	RBR	0.002 °C, 0.003 mS/cm, 2% DO	https://rbr-global.com/products/standard-loggers/rbrduo-ct/
13	RBR Solo-T	RBR global	0.005	\N
14	RBR Duet	RBR global	\N	\N
15	Exo3	YSI	\N	\N
16	NexSens	NexSens	0.075	\N
\.


--
-- Name: organisation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: datalakes
--

SELECT pg_catalog.setval('public.organisation_id_seq', 5, true);


--
-- Name: parameter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: datalakes
--

SELECT pg_catalog.setval('public.parameter_id_seq', 170, true);


--
-- Name: person_id_seq; Type: SEQUENCE SET; Schema: public; Owner: datalakes
--

SELECT pg_catalog.setval('public.person_id_seq', 21, true);


--
-- Name: project_id_seq; Type: SEQUENCE SET; Schema: public; Owner: datalakes
--

SELECT pg_catalog.setval('public.project_id_seq', 11, true);


--
-- Name: sensor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: datalakes
--

SELECT pg_catalog.setval('public.sensor_id_seq', 16, true);


--
-- PostgreSQL database dump complete
--

