/* jshint esnext: true */
/* jshint worker: true */
import {solve} from 'solve';

activate();

function activate(){
  addEventListener('message',runSimulation);
  postMessage({});
}

function runSimulation(event){  
  removeEventListener('message',runSimulation);
  for(var timestep of solve(event.data)) {
    postMessage(timestep);
  }
  self.close();
}
