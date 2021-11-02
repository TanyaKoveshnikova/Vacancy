// globals: prof_data, prof_names, skillset_to_skills, start_year, end_year
// globals: total_vacancies, year_to_total_vacancies, word_to_counters, graph

var MIN_YEAR_TO_TOTAL_VACANCIES = 100

var skill_to_div = {}
var skill_graph
var skill_graph_verbosity = 0.5
var prof_codes = new Set()
var current_prof = "programmer"

function get_raw_prof_name(prof) {
  if (!prof.startsWith("[") || !prof.endsWith("]")) {
    return null;
  }
  return prof.substring(1, prof.length-1)
}

for (prof of prof_data) {
  prof_codes.add(prof["prof_code"])
}

for (prof in prof_names) {
  var raw_prof = get_raw_prof_name(prof)
  if (raw_prof) {
    prof_codes.add(prof)
  }
}


function init_skillgroup_details() {
  // global skillset_to_skills
  var pos = 0
  for (skillset in skillset_to_skills) {
    $("#skillgroup_select").append($("<option></option>").attr("value", skillset)
                           .attr("style", "font-size:small").text(skillset))

    var div = $("<div></div>").attr("id", "skillgroup_" + pos)
    skill_to_div[skillset] = div
    $("#prof_details").append(div)
    pos += 1
  }
  $("#skillgroup_select").selectpicker('refresh')
}

function init_graph() {
  elem = $("#graph_details").get(0)
  // global graph
  skill_graph = ForceGraph()(elem)
    .backgroundColor('rgba(0, 0, 0, 0.0)')
    .nodeRelSize(5)//.d3AlphaDecay(0) // .d3VelocityDecay(0.08)
    .nodeVal(5)
    .width(900)
    .height(700)
    .nodeAutoColorBy('block')
    .nodeColor('color')
    .linkColor((d) => {return d.fraction})
    .linkLabel(node => `${node.source.id} requires ${node.target.id} in ${(node.fraction*100).toFixed(1)}% vacancies`)
    .cooldownTime(6000)
    .nodeLabel(node => `${node.block}: ${node.id}`)
    .linkColor(() => 'rgba(0,0,0,0.2)')
    .linkDirectionalArrowLength(4)
    .onNodeHover(node => elem.style.cursor = node ? 'pointer' : null)
    // .graphData([])
    .nodeCanvasObject((node, ctx, globalScale) => {
          const label = node.id;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.color;
            ctx.fillText(label, node.x, node.y);
    });
}

function update_prof_functions() {
  console.log("update_prof_functions")

  var val = $("#prof_select").val()

  current_prof = prof_names[val][1]
  if (!current_prof) {
    console.log("Failed to change current_prof", val, current_prof)
  }

  var functions = new Set()

  for (prof of prof_data) {
    if (prof["prof_code"] != val) {
      continue
    }

    functions.add(prof["function"])
  }

  // first two are selected
  var selected_funcs = []

  $("#func_select").find("option").remove()
  for (func of functions) {
    $("#func_select").append($("<option></option>").attr("value", func)
                     .attr("style", "font-size:small").text(func))
    if (selected_funcs.length < 1) {
      selected_funcs.push(func)
    }
  }

  $("#func_select").selectpicker('refresh')
  $("#func_select").selectpicker('val', selected_funcs)

  update_skillgroup_counters()
  update_prof_details()
}

function update_prof_details() {
  console.log("update_prof_details")
  var prof_val = $("#prof_select").val()
  var func_val = $("#func_select").val()
  var func_val_set = new Set(func_val)

  var skill_groups = []

  for (prof of prof_data) {
    if (prof["prof_code"] != prof_val || !func_val_set.has(prof["function"])) {
      continue
    }

    if (prof["skill_groups"] == "") {
      continue
    }

    for (skillgroup of prof["skill_groups"].split(/,\s*/)) {
      skill_groups.push(skillgroup)
    }
  }

  $("#skillgroup_select").selectpicker("val", skill_groups)
  update_skillgroup_details()
}

function update_skillgroup_counters() {
  console.log("update_skillgroup_counters")

  // var counters = word_to_counters[current_prof][skill] || [0]
  $("#skillgroup_select").find("option").each(function (idx) {
    var skillset = $(this).val()
    var skills = skillset_to_skills[skillset]

    var skillset_values_sum = 0
    for (skill of skills) {
      var counters = word_to_counters[current_prof][skill] || [0]
      skillset_values_sum += counters.reduce((a, b) => a + b, 0)
    }
    if (skillset_values_sum == 0) {
      return
    }

    var good_skills = 0
    var max_skill_val = 0.0
    for (skill of skills) {
      var counters = word_to_counters[current_prof][skill] || [0]

      var counters_sum = counters.reduce((a, b) => a + b, 0)

      if (counters_sum < MIN_YEAR_TO_TOTAL_VACANCIES) {
        continue
      } else  if (counters_sum / skillset_values_sum < 0.01) {
        continue
      }
      good_skills += 1


      for (var year = start_year; year <= end_year; year += 1) {
        if (year_to_total_vacancies[current_prof][year] < MIN_YEAR_TO_TOTAL_VACANCIES) {
          continue
        }
        var skill_val = counters[year-start_year] / year_to_total_vacancies[current_prof][year] * 100
        if (skill_val > max_skill_val) {
          max_skill_val = skill_val
        }
      }
    }

    $(this).attr("data-subtext", good_skills + " шт., " + max_skill_val.toFixed(2) + "%")
    $(this).attr("raw-percent", max_skill_val)

  })

  $("#skillgroup_select option").sort(function(a, b) {
    var a_percent = parseFloat($(a).attr("raw-percent"))
    var b_percent = parseFloat($(b).attr("raw-percent"))
    return  (a_percent < b_percent) ? 1 : ((a_percent > b_percent) ? -1 : 0)
  }).appendTo("#skillgroup_select")
  $("#skillgroup_select").selectpicker("refresh")
}



function update_skillgroup_details() {
  var skillgroup_val = $("#skillgroup_select").val()

  var enabled_ids = new Set()

  $("#skill_groups").empty()
  $("#skill_groups").append($("<b>Группы умений:</b> "))

  for (skill_group of skillgroup_val) {
    var elem_id = skill_to_div[skill_group].attr("id")
    $("#skill_groups").append($("<a role='button' class='btn btn-link'></a>").attr("href", "#"+elem_id).text(skill_group))
    enabled_ids.add(elem_id)
  }

  var pos = 0
  for (skillset in skillset_to_skills) {
    pos += 1
    // skill_to_div is global
    var div = skill_to_div[skillset]

    if (!enabled_ids.has(div.attr("id"))) {
      div.empty()
      continue
    }

    if (skill_to_div[skillset].children().length == 0) {
      var skills = skillset_to_skills[skillset]
      div.append(gen_prof_details_item(pos, skillset, skills).attr("id", "item" + pos))
    }
  }
  $("#graphskills_select").find("option").remove()
  for (skill_group of skillgroup_val) {
    $("#graphskills_select").append($("<option></option>").attr("value", skill_group)
                           .attr("style", "font-size:small").text(skill_group))
  }
  $("#graphskills_select").selectpicker('refresh')
  // $("#graphskills_select").selectpicker("val", skillgroup_val)
  update_graphskills_details()
}


function update_graphskills_details() {
  update_graph()
  // $("#graph_details").empty()
  // $("#graph_details").append(gen_graph(skills))

}


// здесь график с процентами и навыками(bar)
function gen_pie_plot(pos, skill_group, skills) {
  var data_labels = []
  var data_values = []
  var percent = []

  var skillset_values_sum = 0
  for (skill of skills) {

    var counters = word_to_counters[current_prof][skill] || [0]
    skillset_values_sum += counters.reduce((a, b) => a + b, 0)
  }
  if (skillset_values_sum == 0) {
    return $("<div></div>").attr("id", "pieplot" + pos).get(0)
  }

  for (skill of skills) {
    var counters = word_to_counters[current_prof][skill] || [0]
    var counters_sum = counters.reduce((a, b) => a + b, 0)

    if (counters_sum < MIN_YEAR_TO_TOTAL_VACANCIES) {
      continue
    }

    if (counters_sum / skillset_values_sum < 0.01) {
      continue
    }

    if(data_labels.length != 10 || data_values.length != 10) {
      data_labels.push(skill)
      data_values.push(counters_sum)
      percent.push(((counters_sum / skillset_values_sum) * 100).toFixed(2))
    }
  }


  var data = [{
    x: data_labels,
    y: percent,
    type: 'bar',
    textinfo: "label+percent",
    textposition: "inside",
  }]

  var layout = {
    height: 600,
    width: 900,
    title: skill_group,
    margin: {t: 50},
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)'
  };

  var plot = $("<div></div>").attr("id", "pieplot" + pos).get(0)

  if(data_labels.length >= 1) {
    Plotly.newPlot(plot, data, layout, {displaylogo: false, displayModeBar: false});
  }
  return plot
}

function gen_hist_plot(pos, skill_group, skills) {
  var lines = []

  var skillset_values_sum = 0
  for (skill of skills) {
    var counters = word_to_counters[current_prof][skill] || [0]
    skillset_values_sum += counters.reduce((a, b) => a + b, 0)
  }
  if (skillset_values_sum == 0) {
    return $("<div></div>").attr("id", "histplot" + pos).get(0)
  }

  for (skill of skills) {

    // data_labels.push(skill)
    var counters = word_to_counters[current_prof][skill] || [0]
    // year_to_total_vacancies comes from data.js

    if (counters.length != Object.keys(year_to_total_vacancies[current_prof]).length) {
      console.log("The total vacancies length not equal to counters length", skill, counters.length, Object.keys(year_to_total_vacancies[current_prof]).length)
      continue
    }

    var counters_sum = counters.reduce((a, b) => a + b, 0)
    if (counters_sum < MIN_YEAR_TO_TOTAL_VACANCIES) {
      continue
    } else if (counters_sum / skillset_values_sum < 0.01) {
      continue
    }

    var x_vals = []
    var y_vals = []

    for (var year = start_year; year <= end_year; year += 1) {
      x_vals.push(year)
      if (year_to_total_vacancies[current_prof][year]< MIN_YEAR_TO_TOTAL_VACANCIES) {
        // console.log("Strange, no total vacancies for year", year)
        y_vals.push(0)
        continue
      }

      y_vals.push((counters[year-start_year] / year_to_total_vacancies[current_prof][year] * 100).toFixed(2)) ////////////!
    }

    if (lines.length != 10) {
      lines.push({
        x: x_vals,
        y: y_vals,
        mode: "lines",
        name: skill
      })
    }
    // data_values.push(counters.reduce((a, b) => a + b, 0))
  }

  var layout = {
    showlegend: true,
    height: 450,
    width: 900,
    xaxis: {
        nticks: 30,
        showline: true,
        showgrid: true,
        showticklabels: true,
    },
    yaxis: {
        nticks: 30,
        showgrid: true,
        zeroline: true,
        showline: true,
        showticklabels: true
    },
    autosize: true,
    margin: {t: 10},
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)'
  };

  var plot = $("<div></div>").attr("id", "histplot" + pos).get(0)

  Plotly.newPlot(plot, lines, layout, {displaylogo: false, displayModeBar: false});
  return plot

}

function pruneFocusWord(links, skills, restrict_to_skills) {
    // var good_nodes = {focus_word}

    var back_adj_nodes = {}

    links.forEach(l => {
        var src_id = l.source.id ? l.source.id : l.source
        var tgt_id = l.target.id ? l.target.id : l.target

        if (!back_adj_nodes[tgt_id]) {
            back_adj_nodes[tgt_id] = []
        }

        back_adj_nodes[tgt_id].push(src_id)
    })

    var good_nodes = {}
    var visit_stack = []
    for (skill of skills) {
      good_nodes[skill] = 1
      visit_stack.push(skill)
    }

    while(visit_stack[0]) {
        var word = visit_stack.pop()

        if (!back_adj_nodes[word]) {
            continue
        }

        for (next_word_idx in back_adj_nodes[word]) {
            var next_word = back_adj_nodes[word][next_word_idx]
            if (good_nodes[next_word]) {
                continue
            }

            if (!restrict_to_skills || (restrict_to_skills && skills.has(next_word))) {
              good_nodes[next_word] = 1
              visit_stack.push(next_word)
            }
        }
    }

    links = links.filter(l => {
        var src = l.source.id ? l.source.id : l.source;
        var tgt = l.target.id ? l.target.id : l.target;
        return good_nodes[src] && good_nodes[tgt]
    })

    // console.log(good_nodes)

    return links
}


function pruneGraph(skills, fraction, restrict_to_skills) {
    // console.log("pruneGraph", restrict_to_skills)
    var links = graph[current_prof].links.filter(l => l.fraction >= fraction);
    if (skills.length != 0) {
        links = pruneFocusWord(links, new Set(skills), restrict_to_skills)
    }

    var good_nodes = {}

    links.forEach(l => {
        if (l.source.id) {
            good_nodes[l.source.id] = 1;
        } else {
            good_nodes[l.source] = 1;
        }
        if (l.target.id) {
            good_nodes[l.target.id] = 1;
        } else {
            good_nodes[l.target] = 1;
        }
    })

    var nodes = graph[current_prof].nodes.filter(n => good_nodes[n.id])

    return {nodes, links}
}

function set_graph_verbosity(verbosity) {
  // global skill_graph_verbosity
  skill_graph_verbosity = verbosity

  var skillgroup_val = $("#graphskills_select").val()

  var restrict_to_skills = true

  if (skillgroup_val.length == 0) {
    skillgroup_val = $("#graphskills_select > option").map(function() {return $(this).attr("value")}).get()
    restrict_to_skills = false
  }

  var skills = []
  for (skillgroup of skillgroup_val) {
    // console.log(skillset_to_skills[skillgroup])
    skills = skills.concat(skillset_to_skills[skillgroup])
  }

  skill_graph.graphData(pruneGraph(skills, skill_graph_verbosity, restrict_to_skills))
}

function update_graph() {
  var skillgroup_val = $("#graphskills_select").val()

  var restrict_to_skills = true

  if (skillgroup_val.length == 0) {
    skillgroup_val = $("#graphskills_select > option").map(function() {return $(this).attr("value")}).get()
    restrict_to_skills = false
  }

  var skills = []
  for (skillgroup of skillgroup_val) {
    skills = skills.concat(skillset_to_skills[skillgroup])
  }

  const MAX_LINKS = 200
  const MIN_LINKS = 1

  var good_percentages = []
  var links_lengths = []

  for (percent of [95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10]) {
    var pruned = pruneGraph(skills, percent/100, restrict_to_skills)
    var links_len = pruned["links"].length
    var nodes_len = pruned["nodes"].length
    // console.log(percent, links_len, nodes_len)

    var good = (links_len >= MIN_LINKS) && (links_len <= MAX_LINKS)
    if (good) {
      good_percentages.push(percent)
      links_lengths.push(links_len)
    } else {
      if (links_len > MAX_LINKS) {
        break
      }
    }
  }

  if (good_percentages.length == 0) {
    return
  }

  if (skill_graph_verbosity > good_percentages[0]/ 100) {
    skill_graph_verbosity = good_percentages[0] / 100
  }

  if (skill_graph_verbosity < good_percentages[good_percentages.length - 1] / 100)  {
    skill_graph_verbosity = good_percentages[good_percentages.length - 1] / 100
  }

  $("#graphskills_verbosity_toolbar").empty()
  for (pos in good_percentages) {
    var percent = good_percentages[pos]
    var links_len = links_lengths[pos]

    var label = $("<label class='btn btn-secondary'>").html(">"+percent+"%<br>" + links_len)
    var input = $("<input type='radio' name='options' autocomplete='off'>").attr("onClick", "set_graph_verbosity(" + percent/100 + ")")
    label.append(input)
    $("#graphskills_verbosity_toolbar").append(label)

    // console.log("prefire", skill_graph_verbosity, percent)

    if (Math.abs((skill_graph_verbosity - percent/100)) < 0.000001) {
      // console.log("fire at", percent, skill_graph_verbosity)
      input.attr("checked", "1")
      label.addClass("active")
    }
  }

  skill_graph.graphData(pruneGraph(skills, skill_graph_verbosity, restrict_to_skills))
}

function gen_prof_details_item(pos, skill_group, skill_group_skills) {
  var ret = $("<div style='text-align: center'></div>") //.text(skill_group)
  var skills = skill_group_skills

  ret.append(gen_pie_plot(pos, skill_group, skills))
  ret.append(gen_hist_plot(pos, skill_group, skills))

  return ret
}
