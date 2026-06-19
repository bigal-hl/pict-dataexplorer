const libFable = require('fable');

const defaultFableSettings = (
	{
		Product: 'PictDataExplorerExampleServer',
		ProductVersion: '1.0.0',
		APIServerPort: 9090,

		OratorHTTPProxyDestinationURL: 'http://localhost:8086/',
	});

// Initialize Fable
let _Fable = new libFable(defaultFableSettings);

// Now initialize the Restify ServiceServer Fable Service
_Fable.serviceManager.addServiceType('OratorServiceServer', require('orator-serviceserver-restify'));
_Fable.serviceManager.instantiateServiceProvider('OratorServiceServer',
	{
		RestifyConfiguration: { strictNext: true }
	});

// Now add the orator service to Fable
_Fable.serviceManager.addServiceType('Orator', require('orator'));
let _Orator = _Fable.serviceManager.instantiateServiceProvider('Orator', {});

let tmpAnticipate = _Fable.newAnticipate();

// Initialize the Orator server
tmpAnticipate.anticipate(_Orator.initialize.bind(_Orator));

// Serve the example_applications folder statically (each example lives under its own dist/).
tmpAnticipate.anticipate(
	(fStageComplete) =>
	{
		_Orator.addStaticRoute(`${__dirname}/`);
		return fStageComplete();
	});

// Proxy every /1.0/ request to the locally-running bookstore harness (start it from
// https://github.com/fable-retold/retold-harness — `HARNESS_SCHEMA=bookstore npm start` → :8086).
const libOratorHTTPProxy = require(`orator-http-proxy`);
_Fable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);
_Fable.serviceManager.instantiateServiceProvider('OratorHTTPProxy', { LogLevel: 2 });
tmpAnticipate.anticipate(
	(fNext) =>
	{
		_Fable.OratorHTTPProxy.connectProxyRoutes();
		return fNext();
	});

// Now start the service server.
tmpAnticipate.anticipate(_Orator.startService.bind(_Orator));

tmpAnticipate.wait(
	(pError) =>
	{
		if (pError)
		{
			_Fable.log.error('Error initializing Orator Service Server: ' + pError.message, pError);
		}
		_Fable.log.info(`Pict-DataExplorer examples on http://localhost:${defaultFableSettings.APIServerPort}/ — open /index.html (or /bookstore_explorer/dist/index.html). /1.0/* proxies to the bookstore harness on :8086.`);
	});
