precision mediump float;

// our texcoords from the vertex shader
varying vec2 vTexCoord;

// the texture that we want to manipulate
uniform sampler2D tex0;

// how big of a step to take. 1.0 / width = 1 texel
// doing this math in p5 saves a little processing power
uniform vec2 stepSize;
uniform float dist;

uniform float game_time;

// an array with 9 vec2's
// each index in the array will be a step in a different direction around a pixel
// upper left, upper middle, upper right
// middle left, middle, middle right
// lower left, lower middle, lower right
vec2 offset[9];

// the convolution kernel we will use
// different kernels produce different effects
// we can do things like, emboss, sharpen, blur, etc.
float kernel[9];

// the sum total of all the values in the kernel
float kernelWeight = 0.0;

// our final convolution value that will be rendered to the screen
vec4 conv = vec4(0.0);

//https://thebookofshaders.com/10/
float random (vec2 st) {
    return fract(sin(dot(st.xy,
        vec2(12.9898,78.233)))*
        43758.5453123);
}

/* 3d simplex noise */
//https://www.shadertoy.com/view/XsX3zB
vec3 random3(vec3 c) {
  float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
  vec3 r;
  r.z = fract(512.0*j);
  j *= .125;
  r.x = fract(512.0*j);
  j *= .125;
  r.y = fract(512.0*j);
  return r-0.5;
}

/* skew constants for 3d simplex functions */
const float F3 =  0.3333333;
const float G3 =  0.1666667;

/* 3d simplex noise */
float simplex3d(vec3 p) {
   /* 1. find current tetrahedron T and it's four vertices */
   /* s, s+i1, s+i2, s+1.0 - absolute skewed (integer) coordinates of T vertices */
   /* x, x1, x2, x3 - unskewed coordinates of p relative to each of T vertices*/
   
   /* calculate s and x */
   vec3 s = floor(p + dot(p, vec3(F3)));
   vec3 x = p - s + dot(s, vec3(G3));
   
   /* calculate i1 and i2 */
   vec3 e = step(vec3(0.0), x - x.yzx);
   vec3 i1 = e*(1.0 - e.zxy);
   vec3 i2 = 1.0 - e.zxy*(1.0 - e);
    
   /* x1, x2, x3 */
   vec3 x1 = x - i1 + G3;
   vec3 x2 = x - i2 + 2.0*G3;
   vec3 x3 = x - 1.0 + 3.0*G3;
   
   /* 2. find four surflets and store them in d */
   vec4 w, d;
   
   /* calculate surflet weights */
   w.x = dot(x, x);
   w.y = dot(x1, x1);
   w.z = dot(x2, x2);
   w.w = dot(x3, x3);
   
   /* w fades from 0.6 at the center of the surflet to 0.0 at the margin */
   w = max(0.6 - w, 0.0);
   
   /* calculate surflet components */
   d.x = dot(random3(s), x);
   d.y = dot(random3(s + i1), x1);
   d.z = dot(random3(s + i2), x2);
   d.w = dot(random3(s + 1.0), x3);
   
   /* multiply d by w^4 */
   w *= w;
   w *= w;
   d *= w;
   
   /* 3. return the sum of the four surflets */
   return dot(d, vec4(52.0));
}

void main(){

  vec2 uv = vTexCoord;
  // flip the y uvs
  uv.y = 1.0 - uv.y;

  vec4 bg_col = texture2D(tex0, vec2(0,0));

  // different values in the kernels produce different effects
  // take a look here for some more examples https://en.wikipedia.org/wiki/Kernel_(image_processing) or https://docs.gimp.org/en/plug-in-convmatrix.html

  // here are a few examples, try uncommenting them to see how they affect the image

  // emboss kernel
  kernel[0] = -2.0; kernel[1] = -1.0; kernel[2] = 0.0;
  kernel[3] = -1.0; kernel[4] = 1.0; kernel[5] = 1.0;
  kernel[6] = 0.0; kernel[7] = 1.0; kernel[8] = 2.0;

  // sharpen kernel
  kernel[0] = -1.0; kernel[1] = 0.0; kernel[2] = -1.0;
  kernel[3] = 0.0; kernel[4] = 5.0; kernel[5] = 0.0;
  kernel[6] = -1.0; kernel[7] = 0.0; kernel[8] = -1.0;

  // gaussian blur kernel
  // kernel[0] = 1.0; kernel[1] = 2.0; kernel[2] = 1.0;
  // kernel[3] = 2.0; kernel[4] = 4.0; kernel[5] = 2.0;
  // kernel[6] = 1.0; kernel[7] = 2.0; kernel[8] = 1.0;

  // edge detect kernel
  // kernel[0] = -1.0; kernel[1] = -1.0; kernel[2] = -1.0;
  // kernel[3] = -1.0; kernel[4] = 8.0; kernel[5] = -1.0;
  // kernel[6] = -1.0; kernel[7] = -1.0; kernel[8] = -1.0;
  
  offset[0] = vec2(-stepSize.x, -stepSize.y); // top left
  offset[1] = vec2(0.0, -stepSize.y); // top middle
  offset[2] = vec2(stepSize.x, -stepSize.y); // top right
  offset[3] = vec2(-stepSize.x, 0.0); // middle left
  offset[4] = vec2(0.0, 0.0); //middle
  offset[5] = vec2(stepSize.x, 0.0); //middle right
  offset[6] = vec2(-stepSize.x, stepSize.y); //bottom left
  offset[7] = vec2(0.0, stepSize.y); //bottom middle
  offset[8] = vec2(stepSize.x, stepSize.y); //bottom right

  for(int i = 0; i<9; i++){
    //sample a 3x3 grid of pixels
    vec4 color = texture2D(tex0, uv + offset[i]*dist);

    // multiply the color by the kernel value and add it to our conv total
    conv += color * kernel[i];

    // keep a running tally of the kernel weights
    kernelWeight += kernel[i];
  }

  // normalize the convolution by dividing by the kernel weight
  conv.rgb /= kernelWeight;
  //conv /= kernelWeight;
    
  //gl_FragColor = vec4(conv.rgb, 1.0);
  float noise_zoom = 20.0;
  float noise_speed = 15.0;
  float noise_prc = 1.0;

  vec4 end_col = vec4(conv.rgb,1.0);

  //non background colors
  if ( abs(conv.r-bg_col.r) > 0.01 || abs(conv.g-bg_col.g) > 0.01 || abs(conv.b-bg_col.b) > 0.01){
    noise_prc = 0.6 + 0.4 * simplex3d( vec3((uv.x+conv.r)*noise_zoom, (uv.y+conv.g)*noise_zoom, game_time*noise_speed +conv.b+noise_zoom));
    //float noise_grey = 1.0;
    //vec4 noise_col = vec4(noise_grey,noise_grey,noise_grey,1.0);

    //make a B color to lerp between with the noise value
    float mix = 0.6;
    vec4 alt_col = vec4(1.0,1.0,1.0,1.0);
    alt_col.r = alt_col.r*mix + conv.r*(1.0-mix);
    alt_col.g = alt_col.g*mix + conv.g*(1.0-mix);
    alt_col.b = alt_col.b*mix + conv.b*(1.0-mix);
    //vec4 noise_col = vec4(conv.r*mix,conv.g*mix,conv.b*mix,1.0);

    end_col = noise_prc * vec4(conv.rgb,1.0) + (1.0-noise_prc) * alt_col;
  }
  //background
  else{
    noise_zoom *= 0.2;
    noise_speed *= 0.1;
    noise_prc =  0.3 + 0.7 * simplex3d( vec3(uv.x*noise_zoom, uv.y*noise_zoom, game_time*noise_speed));

    //vec4 noise_col = vec4(250.0/255.0, 243.0/255.0, 235.0/255.0,1.0);
    float noise_grey = 1.0;
    //vec4 noise_col = vec4(noise_grey,noise_grey,noise_grey,1.0);
    
    vec4 alt_col = vec4(61.0/255.0, 48.0/255.0, 31.0/255.0, 1.0);

    end_col = noise_prc * vec4(conv.rgb,1.0) + (1.0-noise_prc) * alt_col;
  }
  
  
  gl_FragColor = end_col;

  //gl_FragColor =conv;
}



/*
precision mediump float;

// lets grab texcoords just for fun
varying vec2 vTexCoord;

// our texture coming from p5
uniform sampler2D tex0;
uniform vec2 resolution;
uniform float offset_range;

void main() {

  vec2 uv = vTexCoord;
  // the texture is loaded upside down and backwards by default so lets flip it
  uv.y = 1.0 - uv.y;

  // lets figure out how big a pixel is on our screen
  // we can do this by diving 1 by the width and height of our sketch
  vec2 pixelSize = vec2(1.0) / resolution;

  // this variable will be used to offset the color channels
  // try changing the 10.0 here to see a bigger or smaller change
  vec2 offset = pixelSize * offset_range;//10.0;

  // make a vec4 for each color channel (rgb)
  // on the red and blue channels, we will move the texture coordinates just a little
  vec4 rTex = texture2D(tex0, uv - offset);
  vec4 gTex = texture2D(tex0, uv);
  vec4 bTex = texture2D(tex0, uv + offset);

  //"white" pixels come in with alpha of 0
  // if(rTex.w < 0.1)  rTex = vec4(1.0,1.0,1.0,1.0);
  // if(gTex.w < 0.1)  gTex = vec4(1.0,1.0,1.0,1.0);
  // if(bTex.w < 0.1)  bTex = vec4(1.0,1.0,1.0,1.0);

  // recombine the three texures into a single one for output
  vec4 color = vec4(rTex.r, gTex.g, bTex.b, 1);
  //vec4 color = vec4(gTex.r, gTex.g, gTex.b, gTex.w);
  //vec4 color = texture2D(tex0, uv);

  gl_FragColor = color;
}
*/