from importlib.util import spec_from_file_location, module_from_spec
spec = spec_from_file_location('hos', './services/hos_engine.py')
mod = module_from_spec(spec)
spec.loader.exec_module(mod)

try:
    timeline = mod.calculate_trip_schedule(distance_miles=1200, drive_time_hours=20, current_cycle_used=68)
    print('OK, events:', len(timeline))
    for e in timeline[:8]:
        print(e['type'], e['start'], e['duration_hours'])
except Exception as e:
    print('ERROR', type(e), e)
