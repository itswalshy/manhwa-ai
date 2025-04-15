const os = require('os');
const logger = require('../config/logger');

/**
 * Calculate resource usage for the system
 * @returns {Object} Object containing CPU and memory usage percentages
 */
exports.calculateResourceUsage = async () => {
  try {
    // Calculate CPU usage
    const cpuUsage = await getCPUUsage();
    
    // Calculate memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = Math.floor(((totalMem - freeMem) / totalMem) * 100);
    
    // Calculate process memory usage
    const processMemory = process.memoryUsage();
    const processMemoryUsage = Math.floor((processMemory.heapUsed / processMemory.heapTotal) * 100);
    
    return {
      cpu: cpuUsage,
      memory: memoryUsage,
      processMemory: processMemoryUsage,
      timestamp: new Date()
    };
  } catch (error) {
    logger.error(`Error calculating resource usage: ${error}`);
    // Return conservative defaults if we can't calculate
    return {
      cpu: 70,
      memory: 70,
      processMemory: 70,
      timestamp: new Date()
    };
  }
};

/**
 * Checks if the system is under heavy load
 * @returns {Boolean} True if the system is under heavy load
 */
exports.isUnderHeavyLoad = async () => {
  const usage = await exports.calculateResourceUsage();
  return (usage.cpu > 70 || usage.memory > 80 || usage.processMemory > 75);
};

/**
 * Estimate free tier limits and current usage
 * @returns {Object} Object containing usage estimates
 */
exports.estimateFreeTierUsage = async () => {
  // Get basic usage
  const usage = await exports.calculateResourceUsage();
  
  // For Railway free tier, estimate relative to $5 credit
  // Assuming a simple linear model
  const railwayEstimate = {
    cpu: usage.cpu,
    memory: usage.memory,
    estimatedCreditsUsed: ((usage.cpu + usage.memory) / 200) * 5, // Simple estimate
    isApproachingLimit: (usage.cpu > 60 || usage.memory > 70),
    recommendedTier: usage.cpu > 75 ? 'lightweight' : (usage.cpu > 50 ? 'standard' : 'enhanced')
  };
  
  return {
    railway: railwayEstimate,
    timestamp: new Date()
  };
};

/**
 * Get the CPU usage percentage
 * @returns {Number} CPU usage percentage
 */
async function getCPUUsage() {
  // Initial CPU info
  const startMeasure = getCPUInfo();
  
  // Wait for a short period to measure difference
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Get CPU info after the wait period
  const endMeasure = getCPUInfo();
  
  // Calculate the difference
  let idleDifference = 0;
  let totalDifference = 0;
  
  for (let i = 0; i < startMeasure.length; i++) {
    // Calculate the difference between start and end values
    const idle = endMeasure[i].idle - startMeasure[i].idle;
    const total = endMeasure[i].total - startMeasure[i].total;
    
    idleDifference += idle;
    totalDifference += total;
  }
  
  // Calculate CPU usage percentage
  const cpuUsage = Math.floor(100 - ((idleDifference / totalDifference) * 100));
  return cpuUsage;
}

/**
 * Get current CPU information
 * @returns {Array} Array of CPU info objects
 */
function getCPUInfo() {
  const cpus = os.cpus();
  
  // Map each CPU to an object with idle and total times
  return cpus.map(cpu => {
    const times = cpu.times;
    // Total time is the sum of all CPU times
    const total = times.user + times.nice + times.sys + times.idle + times.irq;
    
    return {
      idle: times.idle,
      total: total
    };
  });
}

/**
 * Throttle operations based on resource usage
 * @param {Function} callback Function to throttle
 * @param {Object} options Throttling options
 * @returns {Promise} Result of the throttled function or fallback
 */
exports.throttleIfNeeded = async (callback, options = {}) => {
  const { 
    cpuThreshold = 70, 
    memoryThreshold = 80,
    fallback = null,
    retryDelay = 1000,
    maxRetries = 3
  } = options;
  
  let retries = 0;
  
  while (retries < maxRetries) {
    const usage = await exports.calculateResourceUsage();
    
    // If usage is below thresholds, execute the callback
    if (usage.cpu < cpuThreshold && usage.memory < memoryThreshold) {
      return callback();
    }
    
    // Increment retry count
    retries++;
    
    // If we've hit max retries, use fallback
    if (retries >= maxRetries) {
      logger.warn(`Resource throttling: max retries reached, using fallback`);
      return typeof fallback === 'function' ? fallback() : fallback;
    }
    
    // Wait before retrying
    logger.info(`Resource throttling: waiting ${retryDelay}ms before retry ${retries}/${maxRetries}`);
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
}; 