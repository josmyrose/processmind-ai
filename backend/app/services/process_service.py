# app/services/process_service.py

import pm4py

def discover_process(df):
    log = pm4py.format_dataframe(
        df,
        case_id='case_id',
        activity_key='activity',
        timestamp_key='timestamp'
    )

    net, im, fm = pm4py.discover_petri_net_inductive(log)

    return {
        "places": len(net.places),
        "transitions": len(net.transitions)
    }