#!/usr/bin/env python3
"""
STruC++ - IEC 61131-3 Structured Text to C++ Compiler
Setup script for installation
"""

from setuptools import setup, find_packages
import os

# Read the README file
def read_file(filename):
    with open(os.path.join(os.path.dirname(__file__), filename), encoding='utf-8') as f:
        return f.read()

setup(
    name='strucpp',
    version='0.1.0-dev',
    description='IEC 61131-3 Structured Text to C++ Compiler',
    long_description=read_file('README.md'),
    long_description_content_type='text/markdown',
    author='Autonomy Logic / OpenPLC Project',
    author_email='thiago.alves@autonomylogic.com',
    url='https://github.com/Autonomy-Logic/strucpp',
    license='GPLv3',
    
    packages=find_packages(exclude=['tests', 'tests.*']),
    
    python_requires='>=3.8',
    
    install_requires=[
        'lark>=1.1.0',
    ],
    
    extras_require={
        'dev': [
            'pytest>=7.0.0',
            'pytest-cov>=4.0.0',
            'black>=23.0.0',
            'flake8>=6.0.0',
            'mypy>=1.0.0',
        ],
    },
    
    entry_points={
        'console_scripts': [
            'strucpp=strucpp.cli:main',
        ],
    },
    
    classifiers=[
        'Development Status :: 2 - Pre-Alpha',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: GNU General Public License v3 (GPLv3)',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Programming Language :: Python :: 3.12',
        'Topic :: Software Development :: Compilers',
        'Topic :: Software Development :: Code Generators',
    ],
    
    keywords='iec61131-3 plc structured-text compiler code-generator openplc',
    
    project_urls={
        'Bug Reports': 'https://github.com/Autonomy-Logic/strucpp/issues',
        'Source': 'https://github.com/Autonomy-Logic/strucpp',
        'Documentation': 'https://github.com/Autonomy-Logic/strucpp/blob/main/README.md',
    },
)
