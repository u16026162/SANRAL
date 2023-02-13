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
  const env_spec = ['https://cdn.holoviz.org/panel/0.14.2/dist/wheels/bokeh-2.4.3-py3-none-any.whl', 'https://cdn.holoviz.org/panel/0.14.2/dist/wheels/panel-0.14.2-py3-none-any.whl', 'pyodide-http==0.1.0', 'matplotlib', 'pyarrow']
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

# VERSION 2

# # Import Modules

# In[ ]:


import pandas as pd, numpy as np, matplotlib.pyplot as plt, panel as pn, holoviews as hv, datetime as dt
import matplotlib as mpl
import hvplot.pandas

from matplotlib import cm
from matplotlib.figure import Figure

pn.extension()


# # Load Data

# In[ ]:


df = pd.read_pickle("https://raw.githubusercontent.com/u16026162/SANRAL/main/docs/all_thermistor_data.pickle", 
                    compression = "zip")

#df = pd.read_pickle("all_thermistor_data.pickle", compression = "zip")

#df = pd.read_csv("https://raw.githubusercontent.com/u16026162/SANRAL/main/docs/all_thermistor_data.csv")
    
df["Date and Time"] = pd.to_datetime(df["Date and Time"])

start_date = df["Date and Time"].dropna().to_numpy()[0]
end_date = df["Date and Time"].dropna().to_numpy()[-2]

idf = df.interactive()

df.head(n = 5)


# In[ ]:


# Thermistor coordinates:

x = np.array([14.465, 12.777, 12.282, 11.307, 9.836, 7.837, 5.849, 4.377, 3.404, 2.906, 1.205, 
              14.465, 12.777, 12.282, 11.307, 9.836, 7.837, 5.849, 4.377, 3.404, 2.906, 1.205, 
              14.465, 12.777, 12.282, 12.282, 12.282, 11.307, 11.307, 11.307, 9.836, 7.837, 5.849, 
              1.205, 2.906, 3.404, 3.404, 3.404, 4.377, 4.377, 4.377])

y = np.array([1.649, 1.619, 1.606, 1.582, 1.551, 1.504, 1.447, 1.403, 1.373, 1.36, 1.321, 1.549, 
              1.459, 1.372, 1.351, 1.405, 1.41, 1.302, 1.17, 1.142, 1.196, 1.222, 1.448, 1.329, 
              1.141, 0.908, 0.673, 0.653, 0.881, 1.115, 1.262, 1.32, 1.157, 1.117, 1.069, 0.907, 
              0.672, 0.441, 0.471, 0.702, 0.936])

triangles = np.array([[1, 0, 11], [1, 11, 12], [2, 1, 12], [2, 12, 13], [3, 2, 13], [3, 13, 14], [4, 3, 14], 
                      [4, 14, 15], [5, 4, 15], [5, 15, 16], [17, 5, 16], [6, 5, 17], [18, 6, 17], [7, 6, 18], 
                      [19, 7, 18], [8, 7, 19], [20, 8, 19], [9, 8, 20], [21, 9, 20], [10, 9, 21], [12, 11, 22], 
                      [12, 22, 23], [13, 12, 23], [13, 23, 24], [14, 13, 24], [14, 24, 29], [15, 14, 29], 
                      [15, 29, 30], [16, 15, 30], [16, 30, 31], [32, 16, 31], [17, 16, 32], [40, 17, 32], 
                      [18, 17, 40], [35, 18, 40], [19, 18, 35], [34, 19, 35], [20, 19, 34], [33, 20, 34], 
                      [21, 20, 33], [29, 24, 25], [29, 25, 28], [28, 25, 26], [28, 26, 27], [35, 40, 36], 
                      [40, 39, 36], [36, 39, 37], [39, 38, 37], [24, 23, 25], [25, 23, 26], [30, 29, 28], 
                      [30, 28, 27], [40, 32, 39], [39, 32, 38], [34, 35, 36], [34, 36, 37]])

Triangulation = mpl.tri.Triangulation(x, y, triangles)

# Bridge coordinates:

bx = np.array([0.793, 14.895, 14.896, 12.784, 12.285, 10.319, 9.826, 7.838, 5.861, 5.358, 3.392, 2.898, 0.791, 0.793])
by = np.array([1.364, 1.69, 1.444, 1.299, 0.657, 0.601, 1.228, 1.285, 1.135, 0.467, 0.416, 1.037, 1.119, 1.364])


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
                value = dt.datetime(2016, 10, 5, 0, 0),
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


# # Plots

# ## hvPlot

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


# ## Contour

# In[ ]:


def plot_contours(date):
    
    if np.datetime64(date) in df["Date and Time"].dropna().to_numpy():
        title = date
        z = df[df["Date and Time"] == np.datetime64(date)].dropna().to_numpy(dtype = float)[0][1:]
    else:
        date = np.datetime64("2016-01-05T22:00:00.000000000")
        title = "date not in dataset"
        z = np.zeros(41)
    
    
    fig = Figure(figsize = (12.5, 5)) #10, 4
    ax = fig.add_subplot()
    
    levels = np.linspace(int(z.min())-1, int(z.max()+1), 100)
    
    tricontour = ax.tricontourf(Triangulation, z, cmap = "jet", levels = levels)
    bridge = ax.plot(bx, by, color = "k")
    
    cbar = plt.colorbar(tricontour, ticks = np.arange(int(z.min())-1, int(z.max()+2), 1), ax = ax)
    cbar.set_label("Temperature [℃]", rotation=90)
    
    ax.set_title(f"{title}")
    
    ax.set_xlim(0.5, 15.5)
    ax.set_ylim(-1, 3)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.axis("off")
    
    plt.tight_layout()
    
    return fig

# Test:

#plot_contours(dt.datetime(2016, 10, 5, 0, 0))
# In[ ]:


# Make interactive

CONTOUR = pn.bind(plot_contours, date = date_slider)


# In[ ]:





# In[ ]:





# # Panel

# In[ ]:


template = pn.template.FastListTemplate(
            title = "Van Zylspruit Thermistor Data Dashboard - Version 2",
            sidebar = ["Select Thermistor(s):", multi_select, 
                       "Select Date Range:", date_range_slider, 
                       "Select Date:", date_slider],
            main = [PLOT.panel(), CONTOUR],
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