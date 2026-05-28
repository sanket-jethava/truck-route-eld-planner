import importlib.util as u
spec = u.spec_from_file_location('hos', './services/hos_engine.py')
mod = u.module_from_spec(spec)
spec.loader.exec_module(mod)

timeline = mod.calculate_trip_schedule(1200, 20, 68)
print('OK events', len(timeline))
print(timeline[0])
print(timeline[-1])
