function computeAverage(data) {
  let average = [];
  let currentDate = null, currentValues = [];
  data.forEach(d => {
    if (!currentDate) {
      currentDate = new Date(d.date);
    }
    currentValues.push(d.value);
    if (currentDate.getDate() != d.date.getDate()) {
      let mean = 0;
      currentValues.forEach(v => { mean += v; });
      currentDate.setHours(12);
      currentDate.setMinutes(0);
      let value = Math.round(mean / currentValues.length);
      average.push({ date: currentDate, value });
      currentDate = new Date(d.date);
      currentValues = [];
    }
  });
  let mean = 0;
  currentValues.forEach(v => { mean += v; });
  currentDate.setHours(12);
  currentDate.setMinutes(0);
  let value = Math.round(mean / currentValues.length);
  average.push({ date: currentDate, value });
  return average;
}
function filterNoise(data) {
  // Compute standard deviation (i.e. the typical average difference between two points)
  let sumdev = 0;
  data.forEach((d, i) => {
    if (i > 0) {
      sumdev += Math.abs(d.value - data[i-1].value);
    }
  });
  let stddev = sumdev / data.length;
  console.log("stddev", stddev);

  // Then remove every point that is `maxstddev` times different compared to its
  // previous and next point
  let maxstddev = 3;
  let params = new URL(window.location).searchParams;
  if (params.has("maxstddev")) {
    maxstddev = parseInt(params.get("maxstddev"));
  }
  let filterstddev = false;
  if (params.has("filterstddev")) {
    filterstddev = params.get("filterstddev") == "true"
  }
  return data.filter((d, i) => {
    if (i > 0 && i < data.length -1) {
      let previous = data[i - 1].value;
      let next = data[i+1].value;
      let diffPrevious = Math.abs(d.value - previous);
      let diffNext = Math.abs(next - d.value);
      if (diffPrevious > maxstddev * stddev && diffNext > maxstddev * stddev) {
        if (filterstddev) {
          return false;
        } else {
          d.color = "lightgray";
          return true;
        }
      }
    }
    return true;
  });
}

function graph(data, { displayAverageLine = false } = {}) {
  console.log("graph with data", data);

  data = filterNoise(data);

  let svg = d3.select("svg");
  let margin = {top: 20, right: 20, bottom: 30, left: 50};
  let rect = document.getElementById("svg").getBoundingClientRect();
  let width = rect.width - margin.left - margin.right;
  let height = rect.height - margin.top - margin.bottom;

  // Clear any previous content
  svg.selectAll("*").remove();

  let g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  let div = d3.select("body").append("div")  
    .attr("class", "tooltip")        
    .style("opacity", 0);

  let x = d3.scaleTime().rangeRound([0, width]);
  let y = d3.scaleLinear().rangeRound([height, 0]);

  let line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value))
    //.curve(d3.curveBasis);

  let line2 = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value))

  x.domain(d3.extent(data, d => d.date));
  y.domain(d3.extent(data, d => d.value));

  g.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x))
    .select(".domain")
      //.remove();

  g.append("g")
     .call(d3.axisLeft(y))

  g.append("path")
   .datum(data)
   .attr("fill", "none")
   .attr("stroke", "steelblue")
   .attr("stroke-linejoin", "round")
   .attr("stroke-linecap", "round")
   .attr("stroke-width", displayAverageLine? 0.1 : 1.5)
   .attr("d", line);

  if (displayAverageLine) {
    let averageData = computeAverage(data);
    g.append("path")
     .datum(averageData)
     .attr("fill", "none")
     .attr("stroke", "green")
     .attr("stroke-linejoin", "round")
     .attr("stroke-linecap", "round")
     .attr("stroke-width", 2)
     .attr("d", line2);
  }

  let formatTime = d3.timeFormat("%e %B");
  g.selectAll("dot")
   .data(data)
   .enter().append("circle")
     .classed("dot", true)
     .style("stroke", function(d) {
       return d.color ? d.color : "green";
     })
     .style("fill", "white")
     .attr("r", 4)
     .attr("cx", function(d) { return x(d.date); })
     .attr("cy", function(d) { return y(d.value); })
     .on("mouseover", async function(d) {
       // Compute the point link immediately, as onclick should have access to the link
       // synchronously, otherwise popup blocker prevents link opening...
       if (d.getLink) {
         let link = await d.getLink();
         d.link = link;
       }
       div.transition()
          .duration(200)
          .style("opacity", .9);
       let x = 60 + parseInt(d3.select(this).attr("cx"));
       let y = parseInt(d3.select(this).attr("cy"));
       let tooltipWidth = 100;
       if (x + tooltipWidth > window.innerWidth) {
         x -= tooltipWidth + 20;
       }
       let html = formatTime(d.date) + "<br/>"  + d.value;
       div.html(html)
          .style("left", x + "px")
          .style("top", y + "px");
     })
     .on("click", function(d) {
       if (d.link) {
         window.open(d.link, "_blank");
       }
     })
     .on("mouseout", function(d) {
       div.transition()
          .duration(500)
          .style("opacity", 0);
     });
}
