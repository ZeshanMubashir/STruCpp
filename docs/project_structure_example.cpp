// Concrete C++ Example: Generated Code for User's Sample IEC Project
// This file demonstrates what STruC++ Phase 2 would generate for the project structure
// (without the actual ST code compilation, which comes in Phase 3+)

// ============================================================================
// ORIGINAL ST PROJECT (for reference)
// ============================================================================
/*
PROGRAM main
  VAR
    hello : BOOL;
    world : BOOL;
  END_VAR

  hello := world;
END_PROGRAM

PROGRAM another
  VAR
    LocalVar : DINT;
  END_VAR
  VAR_EXTERNAL
    my_global_var : DINT;
  END_VAR

  LocalVar := my_global_var;
END_PROGRAM

CONFIGURATION Config0
  VAR_GLOBAL
    my_global_var : DINT;
  END_VAR

  RESOURCE Res0 ON PLC
    TASK task0(INTERVAL := T#20ms,PRIORITY := 1);
    TASK task1(INTERVAL := T#50ms,PRIORITY := 0);
    PROGRAM instance0 WITH task0 : main;
    PROGRAM instance1 WITH task1 : another;
  END_RESOURCE
END_CONFIGURATION
*/

// ============================================================================
// PHASE 1 RUNTIME (from iec_types.hpp, iec_runtime.hpp)
// ============================================================================

#include <span>
#include <cstdint>

// IEC type wrappers (from Phase 1)
template<typename T>
class IECVar {
private:
    T value_;
    bool forced_;
    T forced_value_;
    
public:
    IECVar() : value_(T()), forced_(false), forced_value_(T()) {}
    explicit IECVar(T val) : value_(val), forced_(false), forced_value_(T()) {}
    
    T get() const { return forced_ ? forced_value_ : value_; }
    void set(T val) { if (!forced_) value_ = val; }
    
    void force(T val) { forced_ = true; forced_value_ = val; }
    void unforce() { forced_ = false; }
    bool is_forced() const { return forced_; }
    
    IECVar& operator=(T val) { set(val); return *this; }
    operator T() const { return get(); }
};

using IEC_BOOL = IECVar<bool>;
using IEC_DINT = IECVar<int32_t>;

// IEC TIME type (simplified for example)
struct IEC_TIME {
    int64_t milliseconds;
    
    static IEC_TIME from_ms(int64_t ms) {
        return IEC_TIME{ms};
    }
};

// Base class for all programs (from Phase 1 runtime)
struct ProgramBase {
    virtual ~ProgramBase() = default;
    virtual void run() = 0;
};

// Task descriptor (from Phase 1 runtime)
struct TaskInstance {
    const char* name;
    IEC_TIME interval;
    int priority;
    ProgramBase* program;  // Points to program instance
};

// Resource descriptor (from Phase 1 runtime)
struct ResourceInstance {
    const char* name;
    std::span<TaskInstance> tasks;
};

// Configuration base (from Phase 1 runtime)
struct ConfigurationInstance {
    const char* name;
    std::span<ResourceInstance> resources;
};

// ============================================================================
// PHASE 2 GENERATED CODE: PROGRAM CLASS DEFINITIONS
// ============================================================================

// Program class for "main"
class Program_main : public ProgramBase {
public:
    // VAR variables (local to program)
    IEC_BOOL hello;
    IEC_BOOL world;
    
    // Constructor
    Program_main() : hello(false), world(false) {}
    
    // Run method (body filled in by Phase 3+ ST compilation)
    void run() override {
        // Phase 2: Empty stub (structure only)
        // Phase 3+: Will contain compiled ST code:
        //   hello.set(world.get());
    }
};

// Program class for "another"
class Program_another : public ProgramBase {
public:
    // VAR variables (local to program)
    IEC_DINT LocalVar;
    
    // VAR_EXTERNAL variables (references to configuration globals)
    IEC_DINT& my_global_var;
    
    // Constructor takes references to external variables
    explicit Program_another(IEC_DINT& global_var)
        : LocalVar(0), my_global_var(global_var) {}
    
    // Run method (body filled in by Phase 3+ ST compilation)
    void run() override {
        // Phase 2: Empty stub (structure only)
        // Phase 3+: Will contain compiled ST code:
        //   LocalVar.set(my_global_var.get());
    }
};

// ============================================================================
// PHASE 2 GENERATED CODE: CONFIGURATION CLASS
// ============================================================================

class Configuration_Config0 : public ConfigurationInstance {
public:
    // VAR_GLOBAL variables
    IEC_DINT my_global_var;
    
    // Program instances
    Program_main instance0;
    Program_another instance1;
    
    // Task descriptors (backing storage)
    TaskInstance tasks_storage[2];
    
    // Resource descriptors (backing storage)
    ResourceInstance resources_storage[1];
    
    // Constructor: Wire up the entire structure
    Configuration_Config0()
        : my_global_var(0),
          instance0(),
          instance1(my_global_var)  // Pass reference to global
    {
        // Initialize task0: INTERVAL := T#20ms, PRIORITY := 1
        tasks_storage[0] = TaskInstance{
            "task0",
            IEC_TIME::from_ms(20),
            1,
            &instance0  // Points to instance0 (Program_main)
        };
        
        // Initialize task1: INTERVAL := T#50ms, PRIORITY := 0
        tasks_storage[1] = TaskInstance{
            "task1",
            IEC_TIME::from_ms(50),
            0,
            &instance1  // Points to instance1 (Program_another)
        };
        
        // Initialize resource Res0
        resources_storage[0] = ResourceInstance{
            "Res0",
            std::span<TaskInstance>(tasks_storage, 2)
        };
        
        // Initialize configuration base
        name = "Config0";
        resources = std::span<ResourceInstance>(resources_storage, 1);
    }
};

// ============================================================================
// PHASE 2 GENERATED CODE: TOP-LEVEL CONFIGURATION ARRAY
// ============================================================================

// Global configuration instance
Configuration_Config0 g_config0;

// Array of all configurations (for runtime to iterate over)
ConfigurationInstance* g_configurations[] = {
    &g_config0
};

const size_t g_num_configurations = sizeof(g_configurations) / sizeof(g_configurations[0]);

// ============================================================================
// RUNTIME INTEGRATION (conceptual - not generated by STruC++)
// ============================================================================

// Example: How the OpenPLC runtime would use this structure
void runtime_cycle() {
    // Iterate over all configurations
    for (size_t i = 0; i < g_num_configurations; i++) {
        ConfigurationInstance* config = g_configurations[i];
        
        // Iterate over all resources in this configuration
        for (auto& resource : config->resources) {
            
            // Iterate over all tasks in this resource
            for (auto& task : resource.tasks) {
                
                // Check if task should run based on interval/priority
                // (simplified - real runtime would use proper scheduling)
                
                // Execute the program instance
                task.program->run();
            }
        }
    }
}

// Example: How to access global variables for debugging/forcing
void debug_access_globals() {
    Configuration_Config0* config = static_cast<Configuration_Config0*>(g_configurations[0]);
    
    // Access global variable
    int32_t value = config->my_global_var.get();
    
    // Force global variable
    config->my_global_var.force(42);
    
    // Check if forced
    bool is_forced = config->my_global_var.is_forced();
    
    // Unforce
    config->my_global_var.unforce();
}

// Example: How to access program instance variables
void debug_access_program_vars() {
    Configuration_Config0* config = static_cast<Configuration_Config0*>(g_configurations[0]);
    
    // Access program instance variables
    bool hello_value = config->instance0.hello.get();
    int32_t local_var_value = config->instance1.LocalVar.get();
    
    // Force program variables
    config->instance0.hello.force(true);
    config->instance1.LocalVar.force(999);
}

// ============================================================================
// KEY OBSERVATIONS
// ============================================================================

/*
1. PHASE 2 SCOPE (Project Structure):
   - Parse CONFIGURATION, RESOURCE, TASK, PROGRAM instance declarations
   - Generate C++ class hierarchy (Config → Resource → Task → Program)
   - Wire up program instances with tasks
   - Handle VAR_GLOBAL and VAR_EXTERNAL references
   - Generate empty .run() stubs
   - NO ST code compilation yet (that's Phase 3+)

2. PHASE 3+ SCOPE (ST Compilation):
   - Parse ST code inside PROGRAM bodies
   - Compile expressions, assignments, control flow
   - Fill in .run() method implementations
   - Use the structure created in Phase 2

3. BENEFITS OF THIS SEPARATION:
   - Can test project structure independently (even with empty .run() methods)
   - Runtime can iterate over configs/resources/tasks without knowing ST details
   - Clear separation of concerns: structure vs. behavior
   - Easy to debug: structure is visible, behavior is in .run()

4. RUNTIME INTEGRATION:
   - Runtime gets clean API: iterate g_configurations array
   - Access tasks via resource.tasks span
   - Call program->run() on each task's program
   - Access global variables via configuration object
   - Access program variables via program instance objects
   - All variables use IECVar wrappers for forcing support

5. PARSING STRATEGY:
   - Use same Lark parser for everything
   - Phase 2: Only parse structural constructs (Config/Resource/Task/Instance/VAR_GLOBAL)
   - Phase 2: Build ProjectModel from AST (ignore program bodies)
   - Phase 3+: Extend to parse program bodies and compile ST code
*/
