importScripts("https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js");

function sendPatch(patch, buffers, msg_id) {
  self.postMessage({
    type: 'patch',
    patch: patch,
    buffers: buffers
  })
}

async function startApplication() {
  console.log("Loading pyodide!");
  self.postMessage({type: 'status', msg: 'Loading pyodide'})
  self.pyodide = await loadPyodide();
  self.pyodide.globals.set("sendPatch", sendPatch);
  console.log("Loaded!");
  await self.pyodide.loadPackage("micropip");
  const env_spec = ['https://cdn.holoviz.org/panel/0.14.2/dist/wheels/bokeh-2.4.3-py3-none-any.whl', 'https://cdn.holoviz.org/panel/0.14.2/dist/wheels/panel-0.14.2-py3-none-any.whl', 'pyodide-http==0.1.0', 'holoviews>=1.15.1', 'holoviews>=1.15.1', 'hvplot', 'matplotlib', 'numpy', 'pandas', 'pyarrow']
  for (const pkg of env_spec) {
    let pkg_name;
    if (pkg.endsWith('.whl')) {
      pkg_name = pkg.split('/').slice(-1)[0].split('-')[0]
    } else {
      pkg_name = pkg
    }
    self.postMessage({type: 'status', msg: `Installing ${pkg_name}`})
    try {
      await self.pyodide.runPythonAsync(`
        import micropip
        await micropip.install('${pkg}');
      `);
    } catch(e) {
      console.log(e)
      self.postMessage({
	type: 'status',
	msg: `Error while installing ${pkg_name}`
      });
    }
  }
  console.log("Packages loaded!");
  self.postMessage({type: 'status', msg: 'Executing code'})
  const code = `
  
import asyncio

from panel.io.pyodide import init_doc, write_doc

init_doc()

#!/usr/bin/env python
# coding: utf-8

# # Import Modules

# In[ ]:


import pandas as pd, numpy as np, matplotlib.pyplot as plt, panel as pn, holoviews as hv, datetime as dt
import hvplot.pandas, pyarrow

from matplotlib import cm
from matplotlib.figure import Figure

#pn.extension("ipywidgets")
#hvplot.extension("matplotlib")


# # Load Data

# In[ ]:


#df = pd.read_parquet("all_thermistor_data.parquet")

df = pd.read_parquet("https://raw.githubusercontent.com/u16026162/SANRAL/main/docs/all_thermistor_data.parquet")

df["Date and Time"] = pd.to_datetime(df["Date and Time"])

start_date = df["Date and Time"].dropna().to_numpy()[0]
end_date = df["Date and Time"].dropna().to_numpy()[-2]

idf = df.interactive()

df.head(n = 5)


# # Widgets

# In[ ]:


# Date range:
date_range_slider = pn.widgets.DateRangeSlider(
                    #name  = "Date Range",
                    start = start_date, 
                    end   = end_date,
                    value = (start_date, end_date),
                    step  = 15*60*1000, # every 15 minutes, in ms
                    format = "%Y-%m-%d %H:%M:%S"
)


# Select Thermistor:
multi_select = pn.widgets.MultiSelect(
                #name = "Select Thermistors:",
                value = list(df.columns)[1:4],# "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11"],
                options = list(df.columns)[1:42], #[1:42]
                size = 8
)

# Select Date:
date_slider = pn.widgets.DateSlider(
                #name  = "Date",
                start = start_date, 
                end   = end_date,
                value = dt.datetime(2016, 10, 5),
                step  = 15*60*1000, # every 15 minutes, in ms
                format = "%Y-%m-%d %H:%M:%S"
)


#date_range_slider
#multi_select
#date_slider


# # Pipeline

# In[ ]:


ipipeline = (
    
    idf

)


# # Interactive Plots

# In[ ]:


def timeline(time):
    return hv.VLine(time).opts(color = "red", line_dash = "dashed")

timeline = pn.bind(timeline, date_slider)

lineplot = hv.DynamicMap(timeline)

# Data:
ihvplot = (
            ipipeline.hvplot(x = "Date and Time", y = multi_select,
                             width = 800, height = 500)\
            
            .apply.opts(xlim=date_range_slider, framewise=True, 
                        xlabel = "Date", ylabel = "Temperature [℃]")
)

#ihvplot
#lineplot

PLOT = ihvplot*lineplot


# # Panel

# In[ ]:


template = pn.template.FastListTemplate(
            title = "Van Zylspruit Thermistor Data Dashboard",
            sidebar = ["Select Thermistor(s):", multi_select, 
                       "Select Date Range:", date_range_slider, 
                       "Select Date:", date_slider],
            main = [PLOT.panel()],
            #theme = "dark",
            #theme_toggle = True
)

#template.show()

template.servable();


# In[ ]:





# In[ ]:





# In[ ]:





# In[ ]:





# In[ ]:





# In[ ]:





# In[ ]:






await write_doc()
  `

  try {
    const [docs_json, render_items, root_ids] = await self.pyodide.runPythonAsync(code)
    self.postMessage({
      type: 'render',
      docs_json: docs_json,
      render_items: render_items,
      root_ids: root_ids
    })
  } catch(e) {
    const traceback = `${e}`
    const tblines = traceback.split('\n')
    self.postMessage({
      type: 'status',
      msg: tblines[tblines.length-2]
    });
    throw e
  }
}

self.onmessage = async (event) => {
  const msg = event.data
  if (msg.type === 'rendered') {
    self.pyodide.runPythonAsync(`
    from panel.io.state import state
    from panel.io.pyodide import _link_docs_worker

    _link_docs_worker(state.curdoc, sendPatch, setter='js')
    `)
  } else if (msg.type === 'patch') {
    self.pyodide.runPythonAsync(`
    import json

    state.curdoc.apply_json_patch(json.loads('${msg.patch}'), setter='js')
    `)
    self.postMessage({type: 'idle'})
  } else if (msg.type === 'location') {
    self.pyodide.runPythonAsync(`
    import json
    from panel.io.state import state
    from panel.util import edit_readonly
    if state.location:
        loc_data = json.loads("""${msg.location}""")
        with edit_readonly(state.location):
            state.location.param.update({
                k: v for k, v in loc_data.items() if k in state.location.param
            })
    `)
  }
}

startApplication()