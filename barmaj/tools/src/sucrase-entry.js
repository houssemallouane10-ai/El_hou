// Exposes self.sucrase.transform for the JS/TS worker (classic worker, importScripts)
import { transform } from 'sucrase';

self.sucrase = { transform };
