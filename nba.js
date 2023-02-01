import { fetchStats } from "./stats.js";
import { fetchPlayer } from './player.js';
import { fetchHeadshot } from './headshot.js';
import { fetchTeams } from "./teams.js";

var player = null;
var chart = null;
var team_map_all = null;
(async function generateChart() {
  player = await fetchPlayer();
  var name = player ? `${player['first_name']} ${player['last_name']}` : "LeBron James";
  const id = await fetchHeadshot(name);
  var stat = $('#stat_select').val();
  console.log(player.team.id);
  const team_map = await fetchTeams();
  var wtf = team_map[1];
  const data = await fetchStats(player, stat, team_map);

  document.body.style.backgroundColor = `rgba(${team_map[player.team.id].secondary_color}, 0.3)`;
  document.querySelector(".btn").style.backgroundColor = `rgba(${team_map[player.team.id].secondary_color}, 0.1)`;
  chart = new Chart(
    document.getElementById('nba'),
    {
      type: 'bar',
      data: {
        labels: data.map(row => row.stat),
        datasets: [
          {
            label: 'Frequency',
            data: data.map(row => row.count),
            backgroundColor: `rgb(${team_map[player.team.id].primary_color})`,
          }
        ]
      },
      options: {
          plugins: {
              title: {
                  display: true,
                  text: `${name} ${stat} this Season`
              }
          },
          ticks: {
            precision:0
          }
      }
    }
  );
  team_map_all = team_map;
})();

$('#stat_select').on('changed.bs.select', async function (e, clickedIndex, isSelected, previousValue) {
  var stat = $('#stat_select').val();
  console.log(stat);
  var name = player ? `${player['first_name']} ${player['last_name']}` : "LeBron James";
  const data = await fetchStats(player, stat, team_map_all);
  console.log(data);
  chart.data.labels = data.map(row => row.stat);
  chart.data.datasets[0].data = data.map(row => row.count);
  chart.options.plugins.title.text = `${name} ${stat} this Season`;

  chart.update();
  return chart;
});

const input = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");

searchBtn.addEventListener("click", function() {
  searchBtn.classList.toggle("close");
  input.classList.toggle("square");
});